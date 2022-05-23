from helper import execute_statement, logger  # type: ignore

# this module
# creates schema for the database

def create_schema():

    # do migration
    create_table_and_index = """
        CREATE TABLE IF NOT EXISTS tags
        (image_id VARCHAR(40) NOT NULL, label VARCHAR(64) NOT NULL,
        PRIMARY KEY (image_id, label),
        INDEX (image_id, label));
    """

    try:
        execute_statement(create_table_and_index)
        response = execute_statement("SHOW TABLES;")
        logger.info(f'List of tables: {response}')
    except Exception as e:
        logger.error(f'Something went wrong while creating table: {e}')
        raise e

    return True