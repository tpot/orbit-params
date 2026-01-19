SITE=ozlabs.org:~tpot/public_html/orbit-params

default:
	@echo Targets are: deploy
	@exit 1

deploy:
	rsync -av src/ $(SITE) --delete
