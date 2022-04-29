# import the psycopg2 database adapter for PostgreSQL
from psycopg2 import connect, Error
import json
import sys
import os

# Check ENV variables
if "DB_HOST" not in os.environ or \
    "DB_PORT" not in os.environ or \
    "DB_USERNAME" not in os.environ or \
    "DB_PASSWORD" not in os.environ or \
    "DB_DATABASE" not in os.environ or \
    "JSON_FILE" not in os.environ:
    print("Run with environment variables: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, JSON_FILE")
    sys.exit(1)

JSON_FILE = os.environ['JSON_FILE']
if not os.path.exists(JSON_FILE):
    print("File " + JSON_FILE + " not exist")
    sys.exit(2)

DB_HOST = os.environ['DB_HOST']
DB_PORT = os.environ['DB_PORT']
DB_USERNAME = os.environ['DB_USERNAME']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_DATABASE = os.environ['DB_DATABASE']

table_name = "endpoints"

with open(JSON_FILE) as json_data:
    record_list = json.load(json_data)

sql_string = ""

# if record list
if type(record_list) == list:
    for item in record_list:
        chain_id = str(item['chain_id'])
        for data_item in item['endpoints']:
            # default values, if not exist value in json
            is_enabled = "true"
            priority = '7'
            if "priority" in data_item:
                priority = str(data_item['priority'])
            if "is_enabled" in data_item:
                is_enabled = str(data_item['is_enabled'])
            endpoint = str(data_item['endpoint'])

            sql_string1 = "UPDATE {} ".format(table_name) + "SET chain_id='" + chain_id + \
                          "', is_enabled=" + is_enabled + ", priority=" + priority + \
                          ", updated_at=now() WHERE endpoint='" + endpoint + "';"
            sql_string2 = "INSERT INTO {} ".format(table_name) + \
                          "(endpoint, chain_id, is_enabled, priority, created_at, updated_at) " + \
                          "SELECT '" + endpoint + "', " + chain_id + ", " + is_enabled + ", " + priority + \
                          ", now(), now() WHERE NOT EXISTS (SELECT 1 FROM {} ".format(table_name) + \
                          "WHERE endpoint='" + endpoint + "');"
            sql_string += sql_string1 + "\n" + sql_string2 + "\n"

# if just one dict obj or nested JSON dict
else:
    print("Needs to be an array of JSON objects")
    sys.exit()

try:
    # declare a new PostgreSQL connection object
    conn = connect(
        dbname=DB_DATABASE,
        user=DB_USERNAME,
        host=DB_HOST,
        password=DB_PASSWORD,
        # attempt to connect for 3 seconds then raise exception
        connect_timeout=3
    )

    cur = conn.cursor()
except (Exception, Error) as err:
    print("\nconnect error:", err)
    conn = None
    cur = None

# only attempt to execute SQL if cursor is valid
if cur != None:

    try:
        cur.execute(sql_string)
        conn.commit()

        print('\nThe migration was successful.')

    except (Exception, Error) as error:
        print("\nexecute_sql() error:", error)
        conn.rollback()

    # close the cursor and connection
    cur.close()
    conn.close()
