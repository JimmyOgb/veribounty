#!/usr/bin/env python3
"""
Seed script for VeriBounty on GenLayer Studionet.
Creates initial on-chain bounties with real escrowed funds.
"""

import sys
import time

try:
    import genlayer_py
    from genlayer_py import create_account, create_client, studionet
    import genlayer_py.contracts.utils as contract_utils
    import genlayer_py.contracts.actions as contract_actions
except ImportError:
    print("Error: genlayer-py is required. Install with: pip install genlayer-py")
    sys.exit(1)

# Ensure calldata encoding uses GenVM standard 'method' key
def _patched_make_calldata_object(method=None, args=None, kwargs=None):
    ret = {}
    if method is not None:
        ret["method"] = method
    if args is not None and len(args) > 0:
        ret["args"] = args
    if kwargs is not None and isinstance(kwargs, dict) and kwargs:
        ret["kwargs"] = kwargs
    return ret

contract_utils.make_calldata_object = _patched_make_calldata_object
contract_actions.make_calldata_object = _patched_make_calldata_object

CONTRACT_ADDRESS = "0x4e7689f4CB926c60016E760cBBBF98578a093F52"
PRIVATE_KEY = "0xf4bfb7f98529b7acf3ec1e9fc2fcf1d573d15d7485163dc35df4ecf4cc695b0f"


def monitor_tx(client, tx_hash: str, label: str):
    print(f"\nMonitoring {label} ({tx_hash})...")
    start = time.time()
    while time.time() - start < 180:
        tx = client.get_transaction(tx_hash)
        if tx:
            status = str(tx.get("status_name") or tx.get("status") or "").upper()
            lifecycle = tx.get("lifecycle", {}).get("state", "")
            print(f"  [{int(time.time() - start)}s] Status: {status} | Lifecycle: {lifecycle}")
            if status in ("ACCEPTED", "FINALIZED") or lifecycle == "finalized":
                print(f"✓ {label} reached consensus!")
                return tx
            if "FAIL" in status or "CANCEL" in status:
                print(f"✗ {label} failed: {status}")
                return tx
        time.sleep(4)
    print("Timed out waiting for tx")
    return None


def main():
    account = create_account(PRIVATE_KEY)
    client = create_client(chain=studionet, account=account)
    print(f"Deployer account: {account.address}")
    print(f"Target contract: {CONTRACT_ADDRESS}")

    bounties_to_create = [
        {
            "title": "Implement EIP-712 Typed Data Signatures",
            "issue_url": "https://github.com/jimmyogb/veribounty/issues/1",
            "criteria": "Must implement typed data hashing, domain separator computation, and verify EIP-712 compliant signatures with 100% test coverage.",
            "value": 1_500_000_000_000_000_000,  # 1.5 GEN
        },
        {
            "title": "Build Real-Time WebSockets Validator Telemetry Gateway",
            "issue_url": "https://github.com/jimmyogb/veribounty/issues/2",
            "criteria": "Build resilient WebSocket stream that pushes validator round state, vote consensus updates, and auto-reconnects on dropped connections.",
            "value": 2_000_000_000_000_000_000,  # 2.0 GEN
        },
    ]

    for i, b in enumerate(bounties_to_create):
        print(f"\n--- Creating Bounty {i + 1}: {b['title']} ---")
        tx_hash = client.write_contract(
            address=CONTRACT_ADDRESS,
            function_name="create_bounty",
            value=b["value"],
            args=[b["title"], b["issue_url"], b["criteria"]],
        )
        print(f"Submitted Tx: {tx_hash}")
        monitor_tx(client, tx_hash, f"Bounty {i+1}")

    # Inspect final stats
    stats = client.read_contract(CONTRACT_ADDRESS, "get_stats")
    print("\nLive Contract Stats after seeding:")
    print(stats)

    all_b = client.read_contract(CONTRACT_ADDRESS, "get_all_bounties")
    print(f"\nTotal live bounties on chain: {len(all_b)}")
    for b in all_b:
        print(f"  #{b['id']} - {b['title']} | Status: {b['status']} | Prize: {b['reward_amount'] / 1e18:.2f} GEN")


if __name__ == "__main__":
    main()
