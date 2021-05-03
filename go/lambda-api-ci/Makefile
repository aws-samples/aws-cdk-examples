ALL: synth

deploy: handler
	npx cdk deploy

diff: handler
	npx cdk diff

synth: handler
	npx cdk synth

handler: src/handler.js

src/handler.js: src/handler.ts src/node_modules src/tsconfig.json
	cd src && yarn build

src/node_modules: src/package.json src/yarn.lock
	cd src && yarn install --frozen-lockfile

.PHONY: ALL handler deploy diff synth
