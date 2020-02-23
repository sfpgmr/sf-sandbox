
VPATH = ./current:./current/src
PAGE_JSON := ./page.json
PAGE_SRC_FILE := ./current/src/ejs/index.ejs ejs/head.ejs ejs/main.ejs ejs/navbar.ejs ejs/scripts.ejs ejs/sidebar.ejs ejs/meta.ejs
NODE := node --no-warnings --experimental-modules
RENDER_PAGE = $(NODE) ./tools/render-page.mjs 
ROLLUP = rollup -c

# index page
TARGET_PAGE := ./current/build/index.html

# article page
TARGET_ARTICLE := ./current/build/article.html
MD_SRC = ./current/src/md/default.md
ARTICLE_SRC = ./current/src/ejs/article.ejs

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

RELEASE_NAME = $(shell date "+%Y%m%d")

.PHONY:all
all:$(TARGET_PAGE) $(TARGET_IFRAME) $(TARGET_IFRAME) $(TARGET_ARTICLE) $(TARGET_SCRIPT)

.PHONY: page
page:$(TARGET_PAGE)

$(TARGET_PAGE):  $(PAGE_JSON) $(PAGE_SRC_FILE) $(TARGET_CSS)
	@$(RENDER_PAGE) $(PAGE_JSON) $< $@

$(TARGET_SCRIPT): $(SCRIPT_SRC) $(DOC_PARSER)
	@$(ROLLUP)

$(TARGET_ARTICLE): $(PAGE_JSON) $(ARTICLE_SRC) $(MD_SRC) 
	@$(RENDER_PAGE) $(PAGE_JSON) $(ARTICLE_SRC) $@

$(DOC_PARSER): $(DOC_PARSER_SRC)
	@$(PEG)

$(TARGET_CSS): $(SRC_CSS)
	@$(CSS)

$(TARGET_IFRAME): 
	@cp $(TARGET_IFRAME_SRC) $(TARGET_IFRAME)

.PHONY: release
release: ;@$(NODE) ./tools/release.mjs $(RELEASE_NAME)

.PHONY: deploy
deploy-server: release $(TARGET_PAGE) 
	@$(NODE) ./tools/deploy.mjs $(RELEASE_NAME)

.PHONY:rebuild
rebuild: clean page

.PHONY: clean
clean:
	@rm $(TARGET_PAGE) $(TARGET_SCRIPT) $(TARGET_CSS) $(TARGET_ARTICLE)

.PHONY:doc-parser
doc-parser: $(DOC_PARSER)

.PHONY: test-parser
test-parser: doc-parser
	@$(NODE) ./tests/parser/markdown-test.mjs
	@ava ./tests/**/*.test.mjs
