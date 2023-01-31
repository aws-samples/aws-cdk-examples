build-TestPackageLayer:
	mkdir -p "$(ARTIFACTS_DIR)/python"
	pip config set global.index-url https://aws:$(CODEARTIFACT_AUTH_TOKEN)@$(DOMAIN)-$(ACCOUNT).d.codeartifact.$(REGION_ARTIFACTS).amazonaws.com/pypi/$(REPO)/simple/
	python3 -m pip install -r requirements.txt -t "$(ARTIFACTS_DIR)/python"