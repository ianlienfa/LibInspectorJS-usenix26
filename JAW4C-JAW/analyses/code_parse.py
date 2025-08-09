import argparse
import json
import subprocess
import json


p = argparse.ArgumentParser(description='A tool that takes a file and the location string.')
p.add_argument('--filepath', "-f",
    help='the filepath of the file to analyze',
    type=str)
p.add_argument('--location', "-l",
    help='the location json string',
    type=str)
args= vars(p.parse_args())

if all(map(lambda x: x == None, args.values())):
    p.print_help()
    exit()

filepath = args['filepath']
location_jsobj_str = (args['location'])

js_code = """
const input = `%s`;
const result = eval('(' + input + ')');
console.log(JSON.stringify(result));
"""%(location_jsobj_str)

# Call Node.js and capture output
output = subprocess.check_output(['node', '-e', js_code], text=True)
location = json.loads(output)

with open(filepath, 'r') as f:
    source_code = f.read()
    def extract_from_position(source_code: str, location: dict) -> str:
        lines = source_code.splitlines()
        res = ""
        start_line = location.get('start').get('line')
        end_line = location.get('end').get('line')
        start_column = location.get('start').get('column')
        end_column = location.get('end').get('column')
        assert(start_line and end_line)        

        # line_number is 1-based, so subtract 1 to get the correct index
        if start_line == end_line:
            res =  lines[start_line - 1][start_column: end_column]
            return res
        else:
            res += lines[start_line - 1][start_column:]
            for line in lines[start_line : end_line - 1]:
                res += line
            res += lines[end_line-1][: end_column]
            return res
    pos_str = extract_from_position(source_code, location)
    print(pos_str)
