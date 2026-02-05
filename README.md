# You Import, They Exploit: Measuring JavaScript Library Exploitability on the Web

This artifact evaluates LibInspectorJS, a scalable pipeline that measures the vulnerable library functions and exploitability on the web. 


# Overview

JavaScript libraries such as jQuery and Lodash are a core
component of the modern web development stack. However,
prior work has shown that websites frequently rely on out-
dated libraries, many of which contain publicly known vul-
nerabilities. LibInspectorJS is a end-to-end pipeline that:

1. Detects vulnerable libraries, including in bundled code, by lifting and analyzing them for identifying features
2. Pinpoints exploitable functions using a new tag-tainting algorithm to match non-standard sinks
3. Evaluates exploitability
through automated data-flow analysis from user-controlled inputs.


# Running the full pipeline (including setting up DB/archive)
### Setting up docker image and running the full pipeline
```
docker compose -p 'artifact' up --build
```
This should be executed in the JAW4C directory, it will set up the python environment and the required docker services 

The default configuration will analyze the archived websites in `JAW4C/JAW4C-WebArchive/archive`, with the indexing file located at `JAW4C/JAW4C-WebArchive/archive/name_mapping.json`
After the analysis, you should be able to see the analysis results in `JAW4C-JAW/data` directory

# Inspecting the outcome with UI 
We provide a simple web-based UI to inspect the analysis results, to run the UI, run the following command in another terminal:
```
docker compose -f JAW4C-UI/docker-compose.yml up --build
```
Navigate to localhost:3001 in your web browser to access the UI.

![The UI will be something like this](IMG/entry.png)

The stats for each site can be shown by clicking on the site entry:
![Site View](IMG/site.png)

Click on lib.detection.json/vuln.out/sink.flows.out to see the detailed analysis results:

### Library Detection Results
![Library Detection Results](IMG/lib-detect.png)

### Vulnerability Query Results
![Vulnerability Query Results](IMG/vuln.png)

### POC Matching and Data Flows
![POC Matching and Data Flows](IMG/flows.png)

# Manually inspecting the pipeline
If you want to manually inspect the pipeline, you can replace the command field of the 'logic' service in docker-compose.yml with a keep-alive command such as:
```
sh -c "while [ 1 ]; do echo '' > /dev/null; done"
```
Then you can exec into the container:
```
# This runs the full pipeline
docker exec artifact-logic-1 sh -c "python3 -m run_pipeline --conf=/JAW4C/JAW4C-JAW/config_docker.yaml"
```
```
# This runs a test my spawning a small web server and crawling against it
docker exec artifact-logic-1 sh -c "cd tests/pipeline_test && python3 test_run.py --action analysis --test integration_test/static_analysis/test_jq_CVE-2020-7656 --config=/JAW4C/JAW4C-JAW/config_docker.yaml"
```

# Anonymous Submission notes
Since this paper uses publicly available tools, including 
JAW(https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://github.com/SoheilKhodayari/JAW&ved=2ahUKEwiZvvTemMOSAxXwFVkFHZ8sPKgQFnoECB0QAQ&usg=AOvVaw3xduNS2xjJY2tBwfcttOwb), PTV(https://github.com/aaronxyliu/PTV), DEBUN(https://github.com/ku-plrg/debun-ase25). 
There are some segment in code that includes copyright notices. We've anoymized those parts for the purpose of review process but would restore them once the whole process is done.
