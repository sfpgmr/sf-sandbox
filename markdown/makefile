
VPATH = ./current:./current/src
NODE := node --no-warnings --experimental-modules
ROLLUP = rollup -c
BUILD_PATH = ./current/build
SITE_BASE = ~/www/html/contents/sandbox/markdown
RELEASE_BASE = ./releases/
MD_BASE = ./current/src/md

RENDER_INDEX = $(NODE) ./tools/render-index.mjs 
RENDER_ARTICLE = $(NODE) ./tools/render-article.mjs 

# index page
TARGET_INDEX := ./releases/index.html
INDEX_JSON := ./page.json
INDEX_SRC_FILE := ./current/src/ejs/index.ejs ejs/head.ejs ejs/article-list.ejs ejs/navbar.ejs ejs/scripts.ejs ejs/sidebar.ejs ejs/meta.ejs ejs/footer.ejs ejs/article-list.ejs 
INDEX_DATA := ./article-list.json

# article page
TARGET_ARTICLE := ./current/build/index.html
MD_SRC = $(MD_BASE)/default.md
ARTICLE_SRC = ./current/src/ejs/article.ejs ejs/head.ejs ejs/article-list.ejs ejs/navbar.ejs ejs/scripts.ejs ejs/sidebar.ejs ejs/meta.ejs ejs/footer.ejs ejs/main.ejs

# script
TARGET_SCRIPT := ./current/build/index.js
SCRIPT_SRC := src/js/index.js

# iframe
TARGET_IFRAME := ./current/build/iframe.html
TARGET_IFRAME_SRC := ./current/src/html/iframe.html 

#css
TARGET_CSS := ./current/build/page.css
SRC_CSS := ./current/src/css/page.css
CSS = $(NODE) --experimental-modules ./tools/build-css.mjs $< $@

# parser
DOC_PARSER_SRC := src/parser/doc-syntax.pegjs 
DOC_PARSER := ./current/src/js/doc-syntax.mjs
TRACE = 
PEG = pegjs $(TRACE) --cache --format es --optimize speed --output $@ $<

# RELEASE_NAME = $(shell date "+%Y%m%d")

.PHONY:all
all:$(TARGET_INDEX) $(TARGET_IFRAME) $(TARGET_IFRAME) $(TARGET_SCRIPT)

.PHONY: page
page:$(TARGET_INDEX)

.PHONY: article
article:$(TARGET_ARTICLE)

$(TARGET_INDEX):  $(INDEX_SRC_FILE) $(TARGET_CSS) $(INDEX_JSON) $(INDEX_DATA)
	@$(RENDER_INDEX) $(BUILD_PATH) $(RELEASE_BASE) $(MD_BASE) $(INDEX_JSON) $< $@

$(TARGET_SCRIPT): $(SCRIPT_SRC) $(DOC_PARSER)
	@$(ROLLUP)

$(TARGET_ARTICLE): $(ARTICLE_SRC) $(INDEX_JSON) $(MD_SRC) $(TARGET_CSS) 
ifdef RELEASE_NAME
	@$(RENDER_INDEX) $(BUILD_PATH) $(RELEASE_BASE) $(MD_BASE) $(INDEX_JSON) $< $@ $(RELEASE_NAME)
else
	@echo ArticleのビルドにはRelease Nameが必要です。
endif

$(DOC_PARSER): $(DOC_PARSER_SRC)
	@$(PEG)

$(TARGET_CSS): $(SRC_CSS)
	@$(CSS)

$(TARGET_IFRAME): $(TARGET_IFRAME_SRC) css/bulma.min.css
	cp $(TARGET_IFRAME_SRC) $(TARGET_IFRAME)
	cp ./current/src/css/bulma.min.css $(BUILD_PATH)

.PHONY: deploy
deploy-server: release
	@$(NODE) ./tools/deploy.mjs $(SITE_BASE) $(RELEASE_BASE) $(RELEASE_NAME)

.PHONY:rebuild
rebuild: clean all

.PHONY: clean
clean:
	-rm -r $(BUILD_PATH)/*

.PHONY:doc-parser
doc-parser: $(DOC_PARSER)

.PHONY: test-parser
test-parser: doc-parser
	@$(NODE) ./tests/parser/markdown-test.mjs
	@ava ./tests/**/*.test.mjs
