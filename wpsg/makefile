

SRC_FILES = ./current/src/js/index.js 
MWASM_SRC = ./current/src/wasm/wpsg.mwat
MWASM_LIB = ./current/build/wpsg.wasm

TARGET = index.js
TRACE = 

$(TARGET): $(SRC_FILES) 
	rollup -c

$(MWASM_LIB): $(MWASM_SRC)
	mwasm --enable-threads --enable-simd $< -o $@ 

.PHONY: run
run: $(TARGET) $(MWASM_LIB)

.PHONY: clean
clean:
	rm $(TARGET) $(MWASM_LIB)
