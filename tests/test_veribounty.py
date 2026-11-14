import functools
import json
import pytest
import gltest.direct.loader as loader


def _to_bytes(addr) -> bytes:
    if addr is None:
        return b""
    if hasattr(addr, "__bytes__"):
        return bytes(addr)
    if hasattr(addr, "as_bytes"):
        return addr.as_bytes
    if isinstance(addr, bytes):
        return addr
    if isinstance(addr, str):
        if addr.startswith("0x"):
            return bytes.fromhex(addr[2:])
        return bytes.fromhex(addr)
    if isinstance(addr, int):
        return addr.to_bytes(20, byteorder="big")
    return bytes(addr)


def to_hex(addr) -> str:
    if isinstance(addr, str):
        return addr.lower()
    b = _to_bytes(addr)
    return ("0x" + b.hex()).lower()


def get_balance(addr) -> int:
    import _genlayer_wasi as wasi
    return wasi.get_balance(_to_bytes(addr))


# Patch loader to track balance transfers when direct_vm.value > 0
if not getattr(loader, "_balance_tracking_installed", False):
    loader._balance_tracking_installed = True
    _orig_make_contract_proxy = loader._make_contract_proxy

    def _custom_make_contract_proxy(instance, vm):
        proxy = _orig_make_contract_proxy(instance, vm)
        proxy_cls = type(proxy)
        if not getattr(proxy_cls, "_patched_for_balances", False):
            proxy_cls._patched_for_balances = True
            orig_getattr = proxy_cls.__getattr__

            def _intercepted_getattr(self, name: str):
                attr = orig_getattr(self, name)
                if not name.startswith("_") and callable(attr):
                    @functools.wraps(attr)
                    def _wrapped(*args, **kwargs):
                        val = vm.value
                        sender = vm.sender
                        res = attr(*args, **kwargs)
                        if val > 0:
                            c_bytes = _to_bytes(vm._contract_address)
                            s_bytes = _to_bytes(sender)
                            vm._balances[c_bytes] = vm._balances.get(c_bytes, 0) + val
                            vm._balances[s_bytes] = vm._balances.get(s_bytes, 0) - val
                        return res
                    return _wrapped
                return attr

            proxy_cls.__getattr__ = _intercepted_getattr
        return proxy

    loader._make_contract_proxy = _custom_make_contract_proxy


@pytest.fixture(autouse=True)
def setup_vm_balance_tracking(direct_vm):
    """Handle native value transfers via gl_call_hook."""
    def gl_call_hook(vm, req):
        if isinstance(req, dict) and "PostMessage" in req:
            msg = req["PostMessage"]
            target = msg.get("address")
            val = int(msg.get("value", 0))
            if val > 0:
                c_bytes = _to_bytes(vm._contract_address)
                t_bytes = _to_bytes(target)
                vm._balances[c_bytes] = vm._balances.get(c_bytes, 0) - val
                vm._balances[t_bytes] = vm._balances.get(t_bytes, 0) + val
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = gl_call_hook


def test_bounty_creation_and_stats(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test payable bounty creation, parameter validation, and get_stats / get_all_bounties."""
    contract = direct_deploy("contracts/veribounty.py")

    # Initial stats should be zero
    stats = contract.get_stats()
    assert stats["total_bounties"] == 0
    assert stats["open_bounties"] == 0
    assert stats["completed_bounties"] == 0
    assert stats["total_escrowed_amount"] == 0
    assert stats["total_submissions"] == 0

    # 1. Successful bounty creation with attached value
    prize = 2_000_000_000_000_000_000  # 2 GEN
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, prize * 2)
    direct_vm.value = prize

    bounty_id = contract.create_bounty(
        "Implement EIP-712 Typed Data Signatures",
        "https://github.com/jimmyogb/veribounty/issues/101",
        "Must implement domain separator and hashStruct according to EIP-712 spec with full test coverage.",
    )
    assert bounty_id == 0

    # Reset value for view calls
    direct_vm.value = 0

    # 2. Inspect retrieved bounty
    bounty = contract.get_bounty(0)
    assert bounty["id"] == 0
    assert bounty["creator"].lower() == to_hex(direct_alice)
    assert bounty["title"] == "Implement EIP-712 Typed Data Signatures"
    assert bounty["issue_url"] == "https://github.com/jimmyogb/veribounty/issues/101"
    assert "EIP-712 spec" in bounty["acceptance_criteria"]
    assert bounty["reward_amount"] == prize
    assert bounty["status"] == "OPEN"
    assert bounty["winner"] == ""
    assert bounty["submission_count"] == 0

    # 3. Check updated stats and all bounties
    stats_after = contract.get_stats()
    assert stats_after["total_bounties"] == 1
    assert stats_after["open_bounties"] == 1
    assert stats_after["completed_bounties"] == 0
    assert stats_after["total_escrowed_amount"] == prize

    all_bounties = contract.get_all_bounties()
    assert len(all_bounties) == 1
    assert all_bounties[0]["id"] == 0

    # 4. Validation reverts
    # Revert if prize == 0
    direct_vm.value = 0
    with direct_vm.expect_revert("[EXPECTED] Reward amount must be greater than 0"):
        contract.create_bounty("Zero Prize", "", "Criteria")

    # Revert if title is empty
    direct_vm.value = 1_000_000
    with direct_vm.expect_revert("[EXPECTED] Title cannot be empty"):
        contract.create_bounty("   ", "", "Criteria")

    # Revert if acceptance criteria is empty
    with direct_vm.expect_revert("[EXPECTED] Acceptance criteria cannot be empty"):
        contract.create_bounty("Valid Title", "", "   ")


def test_rejection_of_invalid_submission(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test AI adjudication rejects an incomplete or placeholder submission."""
    contract = direct_deploy("contracts/veribounty.py")

    prize = 1_000_000_000_000_000_000  # 1 GEN
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, prize * 2)
    direct_vm.value = prize

    contract.create_bounty(
        "Implement WebSockets Heartbeat Monitor",
        "https://github.com/jimmyogb/veribounty/issues/42",
        "Implement periodic ping/pong frames with automated reconnection on disconnect.",
    )
    direct_vm.value = 0

    # Mock web responses for PR and diff
    pr_url = "https://github.com/jimmyogb/veribounty/pull/1"
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/pull/1\.diff.*",
        {"status": 200, "body": "+ // TODO: Implement heartbeat later\n+ function ping() {}"},
    )
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/pull/1(?!\.diff).*",
        {"status": 200, "body": "<html><body>Pull Request #1: WIP heartbeat</body></html>"},
    )
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/issues/42.*",
        {"status": 200, "body": "Issue #42: Need resilient websocket ping/pong protocol."},
    )

    # Mock LLM rejection
    direct_vm.mock_llm(
        r".*auditor for GenLayer decentralized bounty escrow.*",
        json.dumps({
            "approved": False,
            "reason": "The submitted code only contains a TODO stub and does not implement ping/pong frames or automated reconnection.",
        }),
    )

    # Submitter Bob sends verification transaction
    direct_vm.sender = direct_bob
    raw_verdict = contract.submit_and_verify(0, pr_url)
    verdict = json.loads(raw_verdict)

    assert verdict["approved"] is False
    assert "stub" in verdict["reason"]

    # Verify bounty state remains OPEN
    b = contract.get_bounty(0)
    assert b["status"] == "OPEN"
    assert b["winner"] == ""
    assert b["submission_count"] == 1
    assert "stub" in b["last_verdict_reason"]

    # Verify audit trail
    submissions = contract.get_bounty_submissions(0)
    assert len(submissions) == 1
    assert submissions[0]["submitter"].lower() == to_hex(direct_bob)
    assert submissions[0]["submission_url"] == pr_url
    assert submissions[0]["approved"] is False


def test_approval_and_escrow_settlement(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test AI adjudication approves a complete submission and settles escrow."""
    contract = direct_deploy("contracts/veribounty.py")

    prize = 5_000_000_000_000_000_000  # 5 GEN
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, prize * 2)
    direct_vm.value = prize

    contract.create_bounty(
        "Build Optimized Merkle Mountain Range (MMR)",
        "https://github.com/jimmyogb/veribounty/issues/88",
        "Complete append-only MMR data structure with peak hashing and inclusion proof verification.",
    )
    direct_vm.value = 0

    valid_pr = "https://github.com/jimmyogb/veribounty/pull/5"
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/pull/5\.diff.*",
        {"status": 200, "body": "+ class MerkleMountainRange:\n+     def append(self, leaf): ...\n+     def get_peaks(self): ...\n+     def verify_proof(self, proof): return True"},
    )
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/pull/5(?!\.diff).*",
        {"status": 200, "body": "<html><body>PR #5: Production MMR with full test suite passing</body></html>"},
    )
    direct_vm.mock_web(
        r".*github\.com/jimmyogb/veribounty/issues/88.*",
        {"status": 200, "body": "Issue #88: Need fast Merkle Mountain Range."},
    )

    # Mock LLM approval
    direct_vm.mock_llm(
        r".*auditor for GenLayer decentralized bounty escrow.*",
        json.dumps({
            "approved": True,
            "reason": "The submission thoroughly implements the MMR data structure with complete peak hashing and proof verification routines.",
        }),
    )

    bob_initial_balance = get_balance(direct_bob)

    # Bob submits PR
    direct_vm.sender = direct_bob
    raw_verdict = contract.submit_and_verify(0, valid_pr)
    verdict = json.loads(raw_verdict)

    assert verdict["approved"] is True
    assert "thoroughly implements" in verdict["reason"]

    # Verify bounty transitions to COMPLETED
    b = contract.get_bounty(0)
    assert b["status"] == "COMPLETED"
    assert b["winner"].lower() == to_hex(direct_bob)
    assert b["winning_submission_url"] == valid_pr
    assert b["submission_count"] == 1

    # Verify stats reflect completed payout
    stats = contract.get_stats()
    assert stats["completed_bounties"] == 1
    assert stats["open_bounties"] == 0
    assert stats["total_paid_out_amount"] == prize

    # Verify balance increase of winner
    bob_final_balance = get_balance(direct_bob)
    assert bob_final_balance == bob_initial_balance + prize


def test_prevent_duplicate_claims_on_completed_bounty(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """Ensure completed bounties reject further submissions."""
    contract = direct_deploy("contracts/veribounty.py")

    prize = 1_000_000_000_000_000_000
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, prize * 2)
    direct_vm.value = prize

    contract.create_bounty("Task A", "", "Do Task A")
    direct_vm.value = 0

    # Bob submits and wins
    direct_vm.mock_web(r".*", {"status": 200, "body": "diff content"})
    direct_vm.mock_llm(r".*", json.dumps({"approved": True, "reason": "Approved"}))

    direct_vm.sender = direct_bob
    contract.submit_and_verify(0, "https://github.com/jimmyogb/veribounty/pull/1")

    # Charlie tries to claim already COMPLETED bounty
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("[EXPECTED] Bounty is not OPEN"):
        contract.submit_and_verify(0, "https://github.com/jimmyogb/veribounty/pull/2")


def test_cancellation_and_access_control(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test bounty cancellation rules: only creator can cancel when 0 submissions exist."""
    contract = direct_deploy("contracts/veribounty.py")

    prize = 3_000_000_000_000_000_000
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, prize * 2)
    direct_vm.value = prize

    contract.create_bounty("Task B", "", "Do Task B")
    direct_vm.value = 0

    alice_balance_before = get_balance(direct_alice)

    # 1. Non-creator cannot cancel
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("[EXPECTED] Only bounty creator can cancel"):
        contract.cancel_bounty(0)

    # 2. Creator can cancel when 0 submissions
    direct_vm.sender = direct_alice
    contract.cancel_bounty(0)

    b = contract.get_bounty(0)
    assert b["status"] == "CANCELLED"

    # Alice receives refund
    alice_balance_after = get_balance(direct_alice)
    assert alice_balance_after == alice_balance_before + prize

    # Cannot submit to cancelled bounty
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("[EXPECTED] Bounty is not OPEN"):
        contract.submit_and_verify(0, "https://github.com/jimmyogb/veribounty/pull/10")

    # 3. Cannot cancel if submissions already exist
    direct_vm.sender = direct_alice
    direct_vm.value = prize
    contract.create_bounty("Task C", "", "Do Task C")
    direct_vm.value = 0

    direct_vm.mock_web(r".*", {"status": 200, "body": "diff content"})
    direct_vm.mock_llm(r".*", json.dumps({"approved": False, "reason": "Rejected"}))

    direct_vm.sender = direct_bob
    contract.submit_and_verify(1, "https://github.com/jimmyogb/veribounty/pull/11")

    # Creator attempts to cancel after submission attempted
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("[EXPECTED] Cannot cancel bounty with existing submissions"):
        contract.cancel_bounty(1)
