import pytest

def pytest_addoption(parser):
    parser.addoption("--apiurl", action="store", help="Enter the API Gateway URL you want to test against")
    parser.addoption("--region", action="store", help="AWS Region. Must match API Gateway deployment region", default="us-west-2", required=False)

def pytest_generate_tests(metafunc):
    apiurl_value = metafunc.config.option.apiurl
    region_value = metafunc.config.option.region

    if 'apiurl' in metafunc.fixturenames and apiurl_value is not None:
        metafunc.parametrize("apiurl", [apiurl_value])
    
    if 'region' in metafunc.fixturenames and region_value is not None:
        metafunc.parametrize("region", [region_value])