
## Clone project from 
```
git clone https://github.com/oeg-upm/auto-codemeta-generator
```
cd codemeta-generator
python3 -m http.server 80

or 

sudo python3 -m http.server 80


## Install service with FAST API to migrate properties from SOMEF
cd codemeta-generator/server/
sudo apt install python3.10-venv
python3 -m venv venv310
source venv310/bin/activate
pip install --upgrade pip


## Install from Pypi SOMEF, FASTAPI and UVICORN
SOMEF [is available in Pypi!](https://pypi.org/project/somef/). To install it just type:

```
pip install somef fastapi uvicorn
pip show somef fastapi uvicorn
```


```bash
somef --help
```

If everything goes fine, you should see:

```bash
Usage: somef [OPTIONS] COMMAND [ARGS]...

Options:
  -h, --help  Show this message and exit.

Commands:
  configure  Configure credentials
  describe   Running the Command Line Interface
  version    Show somef version.
```

## Configure
Before running SOMEF, you must configure it appropriately. Run:

```bash
python -m nltk.downloader wordnet
python -m nltk.downloader omw-1.4
```
To download two wordnet modules needed. Then run:

```bash
somef configure
```

And you will be asked to provide the following: 

- A GitHub authentication token [**optional, leave blank if not used**], which SOMEF uses to retrieve metadata from GitHub. If you don't include an authentication token, you can still use SOMEF. However, you may be limited to a series of requests per hour. For more information, see [https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) 
- The path to the trained classifiers (pickle files). If you have your own classifiers, you can provide them here. Otherwise, you can leave it blank

If you want to configure SOMEF with the default parameters, just type:

```bash
somef configure -a
```

For showing help about the available options, run:

```bash
somef configure --help
```
Which displays:

```bash
Usage: somef configure [OPTIONS]

  Configure GitHub credentials and classifiers file path

Options:
  -a, --auto  Automatically configure SOMEF
  -h, --help  Show this message and exit.
```

## RUN FAST API
cd codemeta-generator/server/
uvicorn app:app --host 0.0.0.0 --port 23705 --log-level debug

## Config url
There is a config.json where it can be change the default repository to migrate and the fast api url

{
    "default_repo": "https://github.com/tpronk/somef-demo-repo",
    "fastapi_url": "https://api.autocodemeta.linkeddata.es"
}