# VaultChain Selenium tests

Runs Chrome against the real React frontend and Express API. The default runner
starts both services on available local ports with a temporary SQLite database
and temporary upload directories, then stops them and removes the test data.
It does not use or modify your normal database. No manually running app is needed.

## Run

Prerequisites: Node.js/npm, Python 3.10+, and Google Chrome or Chromium.
From `VaultChain/`:

```bash
npm install
python3 -m venv tests/selenium/.venv
source tests/selenium/.venv/bin/activate
pip install -r tests/selenium/requirements.txt
python tests/selenium/test_vaultchain.py
```

Show the browser:

```bash
python tests/selenium/test_vaultchain.py --headed
```

Optional flags:

- `--chrome-binary /path/to/chromium`: choose a browser executable.
- `--timeout 60`: increase element wait time for slower machines.
- `--base-url http://localhost:5173`: test an already running app instead of
  starting isolated services. This creates unique test accounts and an asset in
  that app and leaves them there; use a disposable test instance.

Selenium Manager resolves the Chrome driver automatically; its first run may
need internet access. See the [official Selenium Python documentation](https://github.com/SeleniumHQ/selenium/blob/trunk/py/docs/source/index.rst).

## Coverage

- Unauthenticated users are redirected from protected routes to login.
- Empty login and short registration passwords show validation errors.
- Registration, sidebar navigation, logout, login, and session persistence after refresh.
- Image upload generates a 64-character SHA-256 fingerprint; the asset is
  searchable in the library, an unmatched search shows the empty state, and
  uploading the same file again is rejected.

Each test gets a fresh browser session. Image bytes and account emails are unique
on every run. These are smoke tests, not exhaustive coverage of marketplace
purchases, Vault password controls, document OCR, or administrator workflows.

Failures return exit code 1 and save a screenshot plus page HTML under
`tests/selenium/artifacts/`. Server/client logs are saved there too. Artifacts may
contain the test account's visible data and are ignored by Git. The runner uses
explicit waits for browser interactions rather than fixed delays.

## Organization workspace regressions

```bash
python tests/selenium/test_workspaces.py
node --test client/tests/organizationService.test.mjs
```

Checks workspace-specific navigation, browser history and refresh, separate tabs,
creation, account-scoped local data, invalid workspace IDs, keyboard interactions,
and mobile/collapsed sidebar layouts. Organization features are browser-local
demos, not server-enforced shared memberships. Active selection uses session
storage per account/tab; organization records use account-scoped local storage.
The previous unscoped local-storage records are left untouched.
