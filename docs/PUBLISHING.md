# Publishing to GitHub

This project already has meaningful local commits. GitHub profile contributions are based on commits that are pushed to a repository associated with your account.

## One-command publish after GitHub CLI setup

Install and authenticate GitHub CLI first:

```powershell
winget install --id GitHub.cli
gh auth login
```

Then publish from the project root:

```powershell
.\scripts\publish.ps1
```

The script creates a public `personal-finance-tracker` repository if `origin` does not exist, then pushes the current branch. Use `-Visibility private` if you want a private repo.
