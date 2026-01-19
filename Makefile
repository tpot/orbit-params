SITE=ozlabs.org:~tpot/public_html/orbit-params
EXCLUDES=".git/ Makefile"

default:
	@echo Targets are: deploy
	@exit 1

deploy:
	rsync -av . $(SITE) --delete --exclude $(EXCLUDES)
