import json
import os
import somef
import requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from somef.somef_cli import run_cli

app = FastAPI()

dict_filename = {
    "json": "metadata.json",
    "codemeta": "codemeta.json"
}
#  CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

with open("../js/config.json") as f:
    config = json.load(f)

repo_url = config["project_repository"]

# @app.options("/metadata")
# async def options_metadata():
#     return JSONResponse(status_code=200)
@app.get("/version")
async def get_version():
    version = somef.__version__
    return {"somef_version": version}

@app.get("/latest_release")
async def get_latest_release():
    parts = repo_url.rstrip('/').split('/')
    owner, repo = parts[-2], parts[-1]
    
    # build url api
    api_url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    
    response = requests.get(api_url)
    if response.status_code == 200:
        print(response.status_code)
        print(response.status_code)
        print(response.json())
        return response.json().get("tag_name", "No releases")
    else:
        return f"Error {response.status_code}: {response.json().get('message', 'Unknown error')}"

# get metadata from somef
@app.get("/metadata")
async def get_metadata(repo_url: str = Query(..., alias="url"), threshold: float = 0.8, ignore_classifiers: bool = False):
    path = "./generated-files"
    os.makedirs(path, exist_ok=True)
    
    # json_file = os.path.join(path, "metadata.json")
    path = './generated-files/'
    try:
        run_cli(
            threshold=0.8,
            ignore_classifiers=False,
            repo_url=repo_url,
            output=path+dict_filename.get("json"),
            codemeta_out=path+dict_filename.get("codemeta")
        )
        
        # ---------IN CASE TO RETURN METADATA INSTEAD OF CODEMETA
        # with open(path+dict_filename.get("json"), "r") as file:
        #     metadata = json.load(file)

        # return JSONResponse(content=metadata)
        # --------- 

        with open(path+dict_filename.get("codemeta"), "r") as file:
            codemeta = json.load(file)

        # with open("./generated-files/codemeta_1.json", "r") as file:
        #     codemeta = json.load(file)

        # print(codemeta)
        return JSONResponse(content=codemeta)

    except Exception as e:
        return {"error": str(e)}