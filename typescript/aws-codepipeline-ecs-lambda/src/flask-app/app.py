from flask import Flask, render_template
from waitress import serve
import datetime
import os

app = Flask(__name__)


@app.route('/')
def index():
    now = datetime.datetime.now()
    env = os.getenv('CUSTOM_ENVVAR') if os.getenv('CUSTOM_ENVVAR') else 'Have a nice day!'
    bg = os.getenv('BG_COLOR') if os.getenv('BG_COLOR') else '#7b7b7b'
    return render_template('index.html', context=now, env=env, bg=bg)


if __name__ == "__main__":
    serve(app, host='0.0.0.0', port=80)
