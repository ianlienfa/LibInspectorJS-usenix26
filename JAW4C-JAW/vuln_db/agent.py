from skyvern import Skyvern
import requests
import json
import asyncio


def agent_run(libname, prompt="Find the top post on hackernews today", base_url="http://localhost:3000/advisories_raw", api_base="http://localhost:8000", x_api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ5MDEzNTI4NzYsInN1YiI6Im9fNDMyNTQ0NzY1MTA0MDI5MDM0In0.Pl3mjEyuPlrdYw6cjqBloFyb7-eQ4_21BNNzGNI_Iec"):
    # def library_fetch(libname):            
    #     # Build the filter object
    #     filter_obj = {
    #         "affected": [
    #             {
    #                 "package": {
    #                     "name": libname
    #                 }
    #             }
    #         ]
    #     }

    #     # Construct query params
    #     params = {
    #         "doc": f"cs.{json.dumps(filter_obj)}",  # cs: contains
    #         "order": "ghsa_id.asc"
    #     }

    #     # Make the GET request
    #     try:
    #         res = requests.get(base_url, params=params, headers={"Prefer": "count=exact"})
    #         res.raise_for_status()

    #         data = res.json()
    #         print("Content-Range:", res.headers.get("Content-Range"))
    #         return data

    #     except requests.RequestException as e:
    #         print("error:", e)
    #         return None
    # # lib_entries = library_fetch(libname)            
    async def get_workflow_result(workflow_id, run_id, poll_interval=10):
        def is_status_finalized(status):
            """Check if workflow status is finalized (completed, failed, cancelled)"""
            finalized_statuses = ['completed', 'failed', 'cancelled', 'terminated']
            return status.lower() in finalized_statuses

        def is_status_running_or_queued(status):
            """Check if workflow is still running or queued"""
            running_statuses = ['queued', 'running', 'in_progress']
            return status.lower() in running_statuses
        
        while True:                
            workflow_url = f'{api_base}/api/v1/workflows/{workflow_id}/runs/{run_id}'
            res = requests.get(workflow_url, headers={
                "Content-Type": "application/json",
                "x-api-key": x_api_key
            })
            res.raise_for_status()
            data = res.json()
            status = data.get('status', '').lower()
            print(f"{workflow_url} status: {status}")
            if is_status_finalized(status):
                print(f"{workflow_url} finalized with status: {status}")
                return data
            elif is_status_running_or_queued(status):
                print(f"{workflow_url} still {status}, polling again in {poll_interval} seconds...")
                await asyncio.sleep(poll_interval)
                continue
            else:
                print(f"unknown state entered!")
                raise(RuntimeError)
         
    async def run_skyvern_task(prompt=prompt, max_steps=None, data_extraction_schema=None):                
        print(prompt)
        skyvern = Skyvern(base_url=api_base, api_key=x_api_key)
        try:
            task = await skyvern.run_task(prompt=prompt, data_extraction_schema=data_extraction_schema) 
            task_obj = task.model_dump(mode='json')
            if task.status == 'queued':
                # query the workflow endpoint
                app_url_split = task_obj['app_url'].split('/')
                workflow_id, run_id = app_url_split[-2], app_url_split[-1]
                res = await get_workflow_result(workflow_id, run_id)
                print(res)
                return json.dumps({'status': 'success', 'error': '', 'task_output': task_obj, 'res': res})
            else:
                return json.dumps({'status': 'failed', 'error': 'unexpected status', 'task_output': task_obj})
        except Exception as e:
            return {'status': 'failed', 'error': e}      

    async def vuln_data_base_query(query_string, vuln_db_url='http://localhost:3000/advisories_raw'):
        res = requests.get(f'{vuln_db_url}?{query_string}')
        res.raise_for_status()
        return res.json()
        
    async def main_agent():
        # failing CVE-2018-7212
        query_string = 'doc->>aliases&doc->>aliases=eq.["CVE-2021-23337"]'
        database_json = await vuln_data_base_query(query_string)

        prompt = '''
        Below is a json string from a vulnerability database descripting a cve information
        %s    
        ========
        
        look into these reference links and try to identify the vulnerable function and POC. 
        Look at the urls provided, favor the possibility of finding the required information 
        Find the information of "POC" and "vulnerable_func"

        Below are the guidelines:
        1. When you're browsing these page, directly move on to the next url provided in the initial json reference if you've decided that there's no related information instead of sticking onto one URL. 
        2. For GitHub related link, there might be line numbers in the url, focus on looking at those lines and the neighboring code to understand the context
        3. If you've worked through all URLs given and still don't think you've got enough information, return only the information that you're confident about.
        4. If no plan is found, 
        '''%(database_json)

        data_extraction_schema = {'POC': '', 'vulnerable_func': ''}

        L = await asyncio.gather(
            run_skyvern_task(prompt, data_extraction_schema),
        )
        print(L)


    asyncio.run(main_agent())
    
    


# def raw_fetch(prompt="Find the top post on hackernews today"):
#     llm_base = 'http://localhost:8080'
#     endpoint = '/api/v2/tasks'
#     llm_url = llm_base + endpoint
#     params = {
#         "user_prompt":prompt,
#         "webhook_callback_url":None,
#         "proxy_location":"RESIDENTIAL",
#         "browser_session_id":None,
#         "browser_address":None,
#         "totp_identifier":None,
#         "publish_workflow":"false",
#         "max_screenshot_scrolls":None,
#         "extracted_information_schema":None,
#         "extra_http_headers":None
#     }
#     res = requests.post(llm_url, params=params, headers={
#         "Content-Type": "application/json",
#         "x-api-key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ5MDEzNTI4NzYsInN1YiI6Im9fNDMyNTQ0NzY1MTA0MDI5MDM0In0.Pl3mjEyuPlrdYw6cjqBloFyb7-eQ4_21BNNzGNI_Iec"
#     })
#     res.raise_for_status()
#     data = res.json()

# raw_fetch()
agent_run('lodash')