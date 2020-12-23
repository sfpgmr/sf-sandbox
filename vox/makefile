

SRC_FILES = ./current/src/js/main.js 
MWASM_SRC = ./current/src/mwat/tvram.mwat
MWASM_LIB = ./current/build/tvram.wasm

TARGET = main.js
TRACE = 

$(TARGET): $(SRC_FILES) 
	rollup -c

$(MWASM_LIB): $(MWASM_SRC)
	 mwasm $< -o $@

.PHONY: run
run: $(TARGET) $(MWASM_LIB)

.PHONY: clean
clean:
	rm $(TARGET) $(MWASM_LIB)
