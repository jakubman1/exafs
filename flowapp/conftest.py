"""
PyTest configuration file for all tests
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from __init__ import app as _app
from __init__ import db as _db
import models

TESTDB = 'test_project.db'
TESTDB_PATH = "/tmp/{}".format(TESTDB)
TEST_DATABASE_URI = 'sqlite:///' + TESTDB_PATH


@pytest.fixture(scope='session')
def app(request):
    """
    Create a Flask app, and override settings, for the whole test session.
    """

    _app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=TEST_DATABASE_URI,
    )

    print('\n----- CREATE FLASK APPLICATION\n')

    context = _app.app_context()
    context.push()
    yield _app
    print('\n----- CREATE FLASK APPLICATION CONTEXT\n')

    context.pop()
    print('\n----- RELEASE FLASK APPLICATION CONTEXT\n')


@pytest.fixture(scope='session')
def client(app, request):
    """
    Get the test_client from the app, for the whole test session.
    """
    print('\n----- CREATE FLASK TEST CLIENT\n')
    return app.test_client()


@pytest.fixture()
def db(app, request):
    """
    Create entire database for every test.
    """
    engine = create_engine(_app.config['SQLALCHEMY_DATABASE_URI'], echo=True)
    session_factory = sessionmaker(bind=engine)
    print('\n----- CREATE TEST DB CONNECTION POOL\n')
    if os.path.exists(TESTDB_PATH):
        os.unlink(TESTDB_PATH)

    with app.app_context():
        _db.init_app(app)
        print "#: cleaning database"
        _db.reflect()
        _db.drop_all()
        print "#: creating tables"
        _db.create_all()

        users = [
            {"name": "jiri.vrany@tul.cz", "role_id": 3, "org_id": 1},
            {"name": "petr.adamec@tul.cz", "role_id": 3, "org_id": 1},
            {"name": "adamec@cesnet.cz", "role_id": 3, "org_id": 2}
        ]
        print "#: inserting users"
        models.insert_users(users)

    def teardown():
        _db.session.commit()
        _db.drop_all()
        os.unlink(TESTDB_PATH)

    request.addfinalizer(teardown)
    return _db
