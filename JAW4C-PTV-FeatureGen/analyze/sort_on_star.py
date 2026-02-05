# Sort based on Github star

from urllib.request import Request, urlopen
from dotenv import load_dotenv
load_dotenv()
import MySQLdb
import json
import time

# Github API rate limit: 5000/hr
GITHUB_TOKEN = '<YOUR GITHUB_TOKEN>'

connection = MySQLdb.connect(
  host= 'us-east.connect.psdb.cloud',
  user='yain51suytl8vm1cm4b2',
  passwd= 'YOURPASSWORD',
  db= 'js-lib-detect-trees',
  ssl_mode = "VERIFY_IDENTITY",
  ssl      = {
    "ca": "/etc/ssl/cert.pem"   # For Mac
    # "ca": "/etc/ssl/certs/ca-certificates.crt"  # For Linux
  }
)

cursor = connection.cursor()
cursor.execute("SELECT github_star FROM AllLibs;")
libnames = cursor.fetchall()
connection.close()

stars = []
for entry in libnames:
    stars.append(entry[0])
    
stars.sort(reverse=True)
print(f'Top 100: {stars[99]}')          # 26219
print(f'Top 200: {stars[199]}')         # 17134
print(f'Top 500: {stars[499]}')         # 7693
print(f'Top 1000: {stars[999]}')        # 3557
print(f'Top 2000: {stars[1999]}')       # 976
    

# CREATE TABLE Top100Libs SELECT * FROM AllLibs WHERE github_star >= 26219
