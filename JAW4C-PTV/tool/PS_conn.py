from dotenv import load_dotenv
load_dotenv()
import MySQLdb

def connect_to_planetscale():
    connection = MySQLdb.connect(
        host= 'us-east.connect.psdb.cloud',
        user='yain51suytl8vm1cm4b2',
        passwd= 'YOURPASSWORD',
        db= 'js-lib-detect-trees',
        ssl_mode = "VERIFY_IDENTITY",
        ssl      = {
            "ca": "/etc/ssl/cert.pem"   # For Mac
            }
    )
    return connection