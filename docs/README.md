# XFLASH DOCS

The documentation is written in [Sphinx](http://www.sphinx-doc.org/en/stable/).

## Installation

We recommend creating a virtual environment.

```bash
virtualenv venv
```

Activate the virtual environment.

```bash
source venv/bin/activate
```

Install the requirements.

```
pip install -r requirements.txt
```

## Autobuild

To have Sphinx automatically detect changes to .rst files and serve the latest changes in the browser, run `autobuild.sh`. 

Files will be served at http://127.0.0.1:8000/.
