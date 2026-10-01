"""
Standalone Git Commit & Push Utility
-----------------------------------
Prompts for a commit message, stages all changes (git add -A),
creates a commit, and pushes everything to GitHub.
"""

import sys
import os
import subprocess

def run_git(args):
    """Run a git command and return (returncode, stdout, stderr)"""
    try:
        res = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except FileNotFoundError:
        return -1, "", "Git is not installed or not found in system PATH."
    except Exception as e:
        return -1, "", str(e)


def main():
    # Ensure current working directory is the repository directory
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(repo_dir)

    print("=" * 60)
    print("       STANDALONE GIT COMMIT & PUSH TO GITHUB")
    print("=" * 60)

    # 1. Verify Git availability
    code, stdout, stderr = run_git(["--version"])
    if code != 0:
        print("\n[ERROR] Git not detected!")
        print(stderr or "Please ensure Git is installed and available in PATH.")
        input("\nPress Enter to exit...")
        sys.exit(1)

    # 2. Check current branch and remote
    _, branch, _ = run_git(["branch", "--show-current"])
    branch = branch or "main"
    _, remote, _ = run_git(["remote", "get-url", "origin"])

    print(f"[INFO] Working Directory : {repo_dir}")
    print(f"[INFO] Current Branch    : {branch}")
    if remote:
        print(f"[INFO] Remote Target     : {remote}")
    print("-" * 60)

    # 3. Check git status
    code, status_out, _ = run_git(["status", "--short"])

    # Check for unpushed commits
    _, unpushed_out, _ = run_git(["log", "@{u}..HEAD", "--oneline"])

    if not status_out:
        print("\n[INFO] No modified or untracked files detected.")
        if unpushed_out:
            print("\n[INFO] You have local commits ready to push:")
            for line in unpushed_out.splitlines():
                print(f"  * {line}")
            choice = input("\nPush these commits to GitHub now? (y/n): ").strip().lower()
            if choice == "y":
                print(f"\n[INFO] Pushing to origin {branch}...")
                p_code, p_out, p_err = run_git(["push", "origin", branch])
                if p_code == 0:
                    print("[OK] Successfully pushed to GitHub!")
                    if p_out:
                        print(p_out)
                else:
                    print(f"[ERROR] Push failed:\n{p_err or p_out}")
            else:
                print("Push cancelled.")
        else:
            print("[OK] Everything is already clean and fully up to date with GitHub!")
        input("\nPress Enter to exit...")
        return

    # Display modified files
    print("\nPending changes:")
    for line in status_out.splitlines():
        print(f"  {line}")

    # 4. Prompt for commit message
    print("\n" + "-" * 60)
    while True:
        try:
            commit_msg = input("Enter commit message (or 'q' to cancel): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nCancelled by user.")
            sys.exit(0)

        if not commit_msg:
            print("[WARN] Commit message cannot be empty. Please enter a description.")
            continue
        if commit_msg.lower() == "q":
            print("\nOperation aborted by user.")
            input("Press Enter to exit...")
            return
        break

    # 5. Git add -A
    print("\n[1/3] Staging all changes (git add -A)...")
    add_code, _, add_err = run_git(["add", "-A"])
    if add_code != 0:
        print(f"[ERROR] Failed to stage files:\n{add_err}")
        input("\nPress Enter to exit...")
        sys.exit(1)
    print("[OK] All changes staged.")

    # 6. Git commit
    print(f"\n[2/3] Committing changes with message: \"{commit_msg}\"...")
    com_code, com_out, com_err = run_git(["commit", "-m", commit_msg])
    if com_code != 0:
        # Check if there was actually nothing to commit
        if "nothing to commit" in com_out or "nothing to commit" in com_err:
            print("[INFO] Nothing new to commit.")
        else:
            print(f"[ERROR] Commit failed:\n{com_err or com_out}")
            input("\nPress Enter to exit...")
            sys.exit(1)
    else:
        print("[OK] Commit created successfully:")
        for line in com_out.splitlines()[:4]:
            print(f"     {line}")

    # 7. Git push
    print(f"\n[3/3] Pushing to GitHub (git push origin {branch})...")
    push_code, push_out, push_err = run_git(["push", "origin", branch])

    if push_code == 0:
        print("=" * 60)
        print(" [OK] SUCCESS! All changes have been pushed to GitHub.")
        print("=" * 60)
        if push_out:
            print(push_out)
        if push_err:
            # git push often writes transfer stats to stderr
            print(push_err)
    else:
        print("=" * 60)
        print(" [ERROR] Push to GitHub failed.")
        print("=" * 60)
        print(push_err or push_out)
        print("\nPlease check your internet connection or git authentication.")

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
