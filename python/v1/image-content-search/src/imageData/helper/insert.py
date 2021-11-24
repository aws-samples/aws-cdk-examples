
from helper import batch_execute_statement, logger

# this module
# adds a new image data to the database

def insert_new_image(image_id, labels):

    statement = 'INSERT INTO tags (image_id, label) values (:image_id, :label)'
    params_sets = []

    for l in labels:
        params_sets.append([
                {'name':'image_id', 'value':{'stringValue': image_id}},
                {'name':'label', 'value':{'stringValue': l}}
        ])

    response = batch_execute_statement(statement, params_sets)

    logger.info(f'Number of records updated: {len(response["updateResults"])}')

    return response







