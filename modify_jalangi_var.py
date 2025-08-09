import re
from pathlib import Path


def rename_identifier(file_data, old_ident, new_ident):
    regex = r"((?<=[^\w])|(?<=^))" + re.escape(old_ident) + r"(?=$|[^\w])"
    file_data = re.sub(regex, new_ident, file_data)
    return file_data


def modify_file(file_path, identifier_map):
    try:
        file_data = None
        with open(file_path, 'r') as file_handle_r:
            file_data = file_handle_r.read()
        new_file_data = file_data
        for current_var, new_var in identifier_map.items():
            new_file_data = rename_identifier(new_file_data, current_var, new_var)
        with open(file_path, 'w') as file_handle_w:
            file_handle_w.write(new_file_data)
    except Exception as exn:
        print(f'Failed to modify: {file_path}\nReason: {exn}')


def main(jalangi_src_path, identifier_map):
    js_file_paths = [x for x in jalangi_src_path.glob('**/*.js')]
    html_file_paths = [x for x in jalangi_src_path.glob('**/*.html')]
    file_paths = js_file_paths + html_file_paths
    print(f'Modifying these files: {file_paths}')
    for file_path in file_paths:
        modify_file(file_path, identifier_map)
    print('Done modifying files')


if __name__ == '__main__':
    path_to_jalangi_src = Path('./src/js/')
    identifier_map = {
        'J$': 'jalangiinstrumentation',
    }
    main(path_to_jalangi_src, identifier_map)
