''' 
    This script makes the following assumptions:
        1.  You are using webarchive
        2.  Webarchives are located in /persist/archive
        3.  You want the instrumented cache to be in /persist/cache
'''

import tldextract
import tempfile
import hashlib
import os
import sys
import json
import inspect
import traceback
import subprocess
from multiprocessing import Pool, cpu_count

import psycopg2
from psycopg2 import OperationalError, ProgrammingError
from mitmproxy import http
from pathlib import Path

from bs4 import BeautifulSoup
from typing import Optional

from urllib.parse import urlparse, urlencode, quote_plus
from warcio.warcwriter import WARCWriter
from warcio.archiveiterator import ArchiveIterator
from warcio.statusandheaders import StatusAndHeaders

filename = inspect.getframeinfo(inspect.currentframe()).filename
JALANGI_HOME = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(filename)), os.pardir))
sys.path.insert(0, JALANGI_HOME + '/scripts')
import sj

WORKING_DIR = os.getcwd()

WEBARCHIVES_PATH = f'/persist/{os.getenv("PROXY_ARCHIVE")}/'
CACHE_FOLDER = '/persist/cache'

DOMEVENTS = [
            'onabort', 'onafterprint', 'onanimationend', 'onanimationiteration', 'onanimationstart', 
            'onbeforeprint', 'onbeforeunload', 'onblur', 'oncanplay', 'oncanplaythrough', 'onchange', 
            'onclick', 'oncontextmenu', 'oncopy', 'oncut', 'ondblclick', 'ondrag', 'ondragend', 
            'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 
            'onended', 'onerror', 'onfocus', 'onfocusin', 'onfocusout', 'onfullscreenchange', 
            'onfullscreenerror', 'onhashchange', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 
            'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmessage', 
            'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseover', 'onmouseout', 
            'onmouseup', 'onoffline', 'ononline', 'onopen', 'onpagehide', 'onpageshow', 'onpaste', 
            'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange', 'onresize', 'onreset', 
            'onscroll', 'onsearch', 'onseeked', 'onseeking', 'onselect', 'onshow', 'onstalled', 
            'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'ontouchcancel', 'ontouchend', 
            'ontouchmove', 'ontouchstart', 'ontransitionend', 'onunload', 'onvolumechange', 'onwaiting', 
            'onwheel'
        ]

def load_archive(archive_path):
    responses = []

    with open(archive_path, 'rb') as stream:
        for record in ArchiveIterator(stream):
            try:
                if record.rec_type == 'response':
                    req_url = record.rec_headers.get_header('WARC-Target-URI')
                    
                    status= 502
                    headers = {}
                    if record.http_headers is not None:
                        status = int(record.http_headers.statusline)
                        headers = {x[0]: x[1] for x in record.http_headers.headers}

                    parsed_record = {
                        "status": status,
                        "headers": headers,
                        "payload": record.content_stream().read(),
                    }

                    response = http.Response.make(
                        parsed_record['status'],
                        parsed_record['payload'],
                        parsed_record['headers'],
                    )

                    host = req_url.split('/')[2]
                    if ':' in host:
                        host = host.split(':')[0]
   
                    responses.append((req_url, host, response))
                    
            except Exception as exn:
                print(f'Failed to parse record: {exn}')

    return responses


def babel_rewrite(infn, outfn):
    # since we will change the working directory, the in/out file path need to be absolute
    fin = os.path.abspath(infn)
    fout = os.path.abspath(outfn)
    # assuming babel is installed adjacent to this script's directory
    scriptdir = Path(__file__).parent.parent.resolve()
    cmd = ['npx', 'babel', fin, '--config-file', '../babelrc']
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, cwd=scriptdir, stderr= subprocess.PIPE)
    try:
        stdout, stderr = proc.communicate()
        if proc.returncode != 0:
            print(stderr)
            stdout = b''
    except:
        proc.kill()
        proc.wait()
        raise
    with open(fout, "wb") as outf:
        outf.write(stdout)

def babel_rewrite_snippet(snippet):
    with tempfile.TemporaryDirectory() as tmpdir:
        tempfn = os.path.join(tmpdir, 'tmpjs')
        with open(tempfn, "wb") as tempf:
            tempf.write(snippet.encode("UTF-8"))
        
        babel_rewrite(tempfn, tempfn)
        content = ""

        with open(tempfn, "rb") as tempf:
            content = tempf.read()
    return "\n\n"+content.decode("UTF-8")

def processFile(url, host, content, ext):
    name = 'index'

    hash = hashlib.md5(content).hexdigest()
    folder = f'{CACHE_FOLDER}/{host}/{hash}'
    fileName = f'{folder}/{name}.{ext}'
    instrumentedFileName = f'{folder}/{name}_jalangi_.{ext}'

    try:
        os.makedirs(folder)
    except FileExistsError:
        pass

    if not os.path.isfile(instrumentedFileName):
        print('Instrumenting: ' + fileName + ' from ' + url)
        with open(fileName, 'wb') as file:
            file.write(sj.encode_input(content))

        # after the file is written, we can rewrite it with babel
        if ext == 'js':
            # invoke babel here to transpile js code
            babel_rewrite(fileName, fileName)
        elif ext == 'html':
            # we parse html tags and events to rewrite scripts
            with open(fileName, "rb") as fin:
                content = fin.read()
            soup = BeautifulSoup(content, features="html.parser")
            # rewrite all code in between <script></script>
            scripts = soup.find_all('script')
            for s in scripts:
                if s is None:
                    continue
                # only if it doesn't have a src file
                # and (no type or type is javascript or type is ecmascript)
                if not s.has_attr('src') and \
                    (not s.has_attr('type') or \
                    s['type'].lower().endswith('javascript') or \
                    s['type'].lower().endswith('ecmascript')) :
                    if s.string is not None:
                        s.string = babel_rewrite_snippet(s.string)
                        
            # now deal with the on<event> code snippets
            for e in DOMEVENTS:
                tags = soup.find_all(attrs={e: True})
                for t in tags:
                    rewritten = babel_rewrite_snippet(t[e])
                    t[e] = rewritten

            with open(fileName, 'wb') as fout:
                fout.write(soup.encode())

        sub_env = { 'JALANGI_URL': url }
        def mapper(p):
            path = os.path.abspath(os.path.join(WORKING_DIR, p))
            return path if not p.startswith('--') and (os.path.isfile(path) or os.path.isdir(path)) else p

        jalangiArgs = "--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js"
        jalangiArgs = ' '.join([mapper(x) for x in jalangiArgs.split(' ') if x != ''])
        sj.execute(sj.INSTRUMENTATION_SCRIPT + ' ' + jalangiArgs + ' ' + fileName + ' --out ' + instrumentedFileName + ' --outDir ' + os.path.dirname(instrumentedFileName), None, sub_env)
    else:
        print('Already instrumented: ' + fileName + ' from ' + url)

def instrument_response(response):
    req_url, host, response_flow = response

    content_type = None
    csp_key = None
    for key in response_flow.headers.keys():
        if key.lower() == "content-type":
            content_type = response_flow.headers[key].lower()
        elif key.lower() == "content-security-policy":
            csp_key = key
    if content_type:
        if content_type.find('javascript') >= 0:
            processFile(req_url, host, response_flow.content, 'js')
        if content_type.find('html') >= 0:
            processFile(req_url, host, response_flow.content, 'html')


def instrument_archive(archive):
    print(f'Instrumenting archive {archive}')
    
    try:
        responses = load_archive(archive)
    except:
        print('Failed to load archive:', archive)
        return

    for response in responses:
        try:
            instrument_response(response)
        except:
            # Sometimes, BeautifulSoup crashes. We want to ignore those and other instrumentation errors
            pass

POSTGRES_HOST = os.getenv('POSTGRES_HOST')
POSTGRES_DB = os.getenv('POSTGRES_DB')
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
POSTGRES_PORT = os.getenv('POSTGRES_PORT')

params = f"host={POSTGRES_HOST} dbname={POSTGRES_DB} port={POSTGRES_PORT}\
    user={POSTGRES_USER} password={POSTGRES_PASSWORD}"


class Wrapper:
    ''' If we spend too long without querying the database, we might lose the connection
            This wrapper is here to ensure that we can smoothly continue crawling even if that happens
                This was taken from control_daemon/utils.py, sounds like deduplicating this class would be a lot of trouble
    '''
    def __init__(self, cur, conn):
        self.cur = cur
        self.conn = conn
    def commit(self):
        return self.conn.commit()
    def execute(self, query, vals=None):
        try:
            return self.cur.execute(query, vals)
        except OperationalError as e:
            print("Database error occured when performing query", query, vals, e)
            # Database connection might timeout because of prolonged periods of time without queries
                # Try just one more time to execute
            if "server closed the connection unexpectedly" in str(e):
                self.conn.reset()
                self.cur = self.conn.cursor()
                return self.cur.execute(query, vals)

    def fetchone(self):
        return self.cur.fetchone()


def run_instrumentation(thread_nr):
    conn = psycopg2.connect(params)
    cur = conn.cursor()

    wrapper = Wrapper(cur, conn)

    while 1:

        # Get webarchive to instrument
        wrapper.execute(
            f"""
            UPDATE Archive_Lookup
            SET
                status = 'instrumenting'
            WHERE Hashs = (
                SELECT Hashs
                FROM Archive_Lookup
                WHERE status = 'non_instrumented'
                LIMIT 1 FOR UPDATE SKIP LOCKED
            )
            RETURNING Hashs;
            """)

        wrapper.commit()

        try:
            to_instrument = wrapper.fetchone()
        except ProgrammingError:
            # Weirdly enough, psycopg2 can actually explode here if the SKIP LOCKED did its job (different from the situation where the WHERE clause finds nothing):https://github.com/psycopg/psycopg2/issues/346 
            break

        #If none, exit the while block because there are no remaining websites to instrument
        if to_instrument is None or to_instrument[0] is None:
            break

        to_instrument = to_instrument[0]
        
        instrument_archive(to_instrument)

        wrapper.execute('''UPDATE Archive_Lookup SET status='instrumented' WHERE Hashs=%s''', (to_instrument,))
        wrapper.commit()

    print(thread_nr,'is done')
    return True


threads_in_parallel = cpu_count() # Adjust this if you want
with Pool(threads_in_parallel) as p:
    print(p.map(run_instrumentation, range(threads_in_parallel)))
