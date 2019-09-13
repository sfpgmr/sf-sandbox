   (module (type $oscillatorFunc (func (param i32) (result f32)))  (import "env" "memory" (memory $memory 20 20 shared)) (import "imports" "sin" (func $sin (param $a f64) (result f64))) (import "imports" "cos" (func $cos (param $a f64) (result f64))) (import "imports" "sinh" (func $sinh (param $a f64) (result f64))) (import "imports" "exp" (func $exp (param $a f64) (result f64))) (import "imports" "pow" (func $pow (param $a f64) (param $b f64) (result f64))) (import "imports" "log" (func $log (param $a f64) (result f64))) (export "setRate" (func $set_rate)) (export "initEnvelope" (func $initEnvelope)) (export "initEnvelopeWork" (func $initEnvelopeWork)) (export "keyOnEnvelope" (func $keyOnEnvelope)) (export "keyOffEnvelope" (func $keyOffEnvelope)) (export "doEnvelope" (func $doEnvelope)) (export "initMemory" (func $initMemory)) (export "allocateMemory" (func $allocateMemory)) (export "freeMemory" (func $freeMemory)) (export "initWaveTable" (func $initWaveTable)) (export "allocateWaveTable" (func $allocateWaveTable)) (export "initWaveTableWork" (func $initWaveTableWork)) (export "readWaveTable" (func $readWaveTable)) (export "initOutputBuffer" (func $initOutputBuffer)) (export "initTestTimbre" (func $initTestTimbre)) (export "processTimbre" (func $processTimbre)) (export "keyOnTimbre" (func $keyOnTimbre)) (export "keyOffTimbre" (func $keyOffTimbre)) (table 16 funcref) (elem (i32.const 0) $readWaveTable)  (elem (i32.const 8) $readWaveTable)                    (data (i32.const 15312) "\00\00\00\00\c2\c5\47\3e\15\ef\c3\3e\da\39\0e\3f\f3\04\35\3f\31\db\54\3f\5e\83\6c\3f\be\14\7b\3f\00\00\80\3f\be\14\7b\3f\5e\83\6c\3f\31\db\54\3f\f3\04\35\3f\da\39\0e\3f\15\ef\c3\3e\c2\c5\47\3e\32\31\0d\25\c2\c5\47\be\15\ef\c3\be\da\39\0e\bf\f3\04\35\bf\31\db\54\bf\5e\83\6c\bf\be\14\7b\bf\00\00\80\bf\be\14\7b\bf\5e\83\6c\bf\31\db\54\bf\f3\04\35\bf\da\39\0e\bf\15\ef\c3\be\c2\c5\47\be")   (func $initMemory (i32.store (i32.const 0) (i32.const 15440) ) )  (func $allocateMemory (param $size i32) (result i32) (local $mem_offset i32) (local $mem_offset_before i32) (local $mem_page i32)  (local.set $size (i32.and (i32.add (local.get $size) (i32.const 0x7) ) (i32.const 0xffff_fff8) ) ) (if (i32.gt_u (local.tee $mem_page (i32.add (i32.shr_u (local.tee $mem_offset (i32.add (local.get $size) (local.tee $mem_offset_before (i32.load (i32.const 0)) ) ) ) (i32.const 16) ) (i32.const 1) ) ) (memory.size) ) (then  (memory.grow (i32.const 2)     ) (drop) ) ) (i32.store (i32.const 0) (local.get $mem_offset) ) (local.get $mem_offset_before) )  (func $freeMemory (param $offset i32) (i32.store (i32.const 0) (local.get $offset) ) )  (func $set_rate (param $r f32) (f32.store (i32.const 4) (local.get $r) ) (f32.store (i32.const 8) (f32.div (f32.const 1) (local.get $r) ) ) )   (func $initWaveTable  (param $wave_table_offset i32)  (param $size i32) (i32.store (i32.add (i32.const 0) (local.get $wave_table_offset) ) (i32.const 0) ) (i32.store (i32.add (i32.const 8) (local.get $wave_table_offset) ) (local.get $size) ) (i32.store (i32.add (i32.const 12) (local.get $wave_table_offset) ) (i32.sub (local.get $size) (i32.const 1) ) )  (i32.store (i32.add (i32.const 4) (local.get $wave_table_offset) ) (i32.const 0) ) )  (func $allocateWaveTable (param $data_size i32) (result i32) (local $offset i32) (call $initWaveTable (local.tee $offset (call $allocateMemory (i32.add (local.get $data_size) (i32.const 16) ) ) ) (local.get $data_size) ) (local.get $offset) )  (func $initWaveTableWork (param $wave_table_work_offset i32) (param $wave_table_offset i32) (param $base_frequency f32) (f32.store (i32.add (i32.const 12) (local.get $wave_table_work_offset) ) (f32.load (i32.const 4)) ) (f32.store (i32.add (i32.const 24) (local.get $wave_table_work_offset) ) (local.get $base_frequency) ) (f32.store (i32.add (i32.const 28) (local.get $wave_table_work_offset) ) (f32.mul (local.get $base_frequency) (f32.convert_i32_s (i32.load (i32.add (i32.const 8) (local.get $wave_table_offset) ) ) ) ) ) (i32.store (i32.add (i32.const 32) (local.get $wave_table_work_offset) ) (i32.const 0) )  (f32.store (i32.add (i32.const 8) (local.get $wave_table_work_offset) ) (f32.const 1) )  (f32.store (i32.add (i32.const 36) (local.get $wave_table_work_offset) ) (f32.load (i32.add (i32.const 12) (local.get $wave_table_work_offset) ) ) )  (f32.store (i32.add (i32.const 16) (local.get $wave_table_work_offset) ) (f32.const 0) )  (i32.store (i32.add (i32.const 0) (local.get $wave_table_work_offset) ) (local.get $wave_table_offset) ) )  (func $readWaveTable (type $oscillatorFunc) (param $wave_table_work_offset i32) (result f32) (local $wave_table_offset i32) (local $counter i32) (local $value f32) (local $delta f32) (if (f32.le (local.tee $delta (f32.sub (local.tee $delta (f32.load (i32.add (i32.const 36) (local.get $wave_table_work_offset) ) ) ) (f32.load (i32.add (i32.const 28) (local.get $wave_table_work_offset) ) ) ) ) (f32.const 0) ) (then (local.set $wave_table_offset (i32.load (i32.add (i32.const 0) (local.get $wave_table_work_offset) ) ) )  (f32.store (i32.add (i32.const 16) (local.get $wave_table_work_offset) ) (local.tee $value (f32.load (i32.add (i32.shl (local.tee $counter (i32.and (i32.add (i32.load (i32.add (i32.const 32) (local.get $wave_table_work_offset) ) ) (i32.const 1) ) (i32.load (i32.add (i32.const 12) (local.get $wave_table_offset) ) ) ) ) (i32.const 2) ) (i32.add (i32.const 16) (local.get $wave_table_offset) ) ) ) ) ) (i32.store (i32.add (i32.const 32) (local.get $wave_table_work_offset) ) (local.get $counter) )   (f32.store (i32.add (i32.const 28) (local.get $wave_table_work_offset) ) (f32.mul (f32.load (i32.add (i32.const 24) (local.get $wave_table_work_offset) ) ) (f32.convert_i32_s (i32.load (i32.add (i32.const 8) (local.get $wave_table_offset) ) ) ) ) ) (f32.store (i32.add (i32.const 36) (local.get $wave_table_work_offset) ) (local.tee $delta (f32.add (local.get $delta) (f32.mul (f32.load (i32.add (i32.const 12) (local.get $wave_table_work_offset) ) ) (f32.load (i32.add (i32.const 8) (local.get $wave_table_work_offset) ) ) ) ) ) ) (return (local.get $value)) ) ) (f32.store (i32.add (i32.const 36) (local.get $wave_table_work_offset) ) (local.get $delta ) ) (f32.load (i32.add (i32.const 16) (local.get $wave_table_work_offset) ) ) )     (func $initEnvelope (param $env_param_offset i32) (param $sample_rate f32) (param $attack_time f32) (param $decay_time f32) (param $sustain_level f32) (param $release_time f32) (param $level f32)  (f32.store (i32.add (i32.const 4) (local.get $env_param_offset)) (local.get $attack_time) ) (f32.store (i32.add (i32.const 20) (local.get $env_param_offset)) (f32.div (f32.const 1) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 4) (local.get $env_param_offset))) ) ) )  (f32.store (i32.add (i32.const 8) (local.get $env_param_offset)) (local.get $decay_time) ) (f32.store (i32.add (i32.const 24) (local.get $env_param_offset)) (f32.div (f32.sub (f32.const 1) (f32.load (i32.add (i32.const 12) (local.get $env_param_offset))) ) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 8) (local.get $env_param_offset))) ) ) )  (f32.store (i32.add (i32.const 12) (local.get $env_param_offset)) (local.get $sustain_level) )  (f32.store (i32.add (i32.const 16) (local.get $env_param_offset)) (local.get $release_time) ) (f32.store (i32.add (i32.const 28) (local.get $env_param_offset)) (f32.div (f32.load (i32.add (i32.const 12) (local.get $env_param_offset))) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 16) (local.get $env_param_offset))) ) ) ) (f32.store (i32.add (i32.const 0) (local.get $env_param_offset)) (local.get $level) ) )  (func $initEnvelopeWork (param $env_work_offset i32) (param $env_param_offset i32)  (i32.store (i32.add (i32.const 0) (local.get $env_work_offset)) (local.get $env_param_offset) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (f32.const 0) )  (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const 0) )  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 0) )  (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (f32.const 0) ) )  (func $keyOnEnvelope (param $env_work_offset i32)  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.or (i32.const 0x80000000) (i32.load (i32.add (i32.const 4) (local.get $env_work_offset))) ) )  (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const 0) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (f32.const 0) )  (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (f32.const 0) ) )  (func $keyOffEnvelope (param $env_work_offset i32)  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.and (i32.const 0x7fffffff) (i32.load (i32.add (i32.const 4) (local.get $env_work_offset))) ) )  (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const 3) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (f32.const 0) ) )  (func $doEnvelope (param $env_work_offset i32) (result f32) (local $env_param_offset i32) (local $counter f32) (local $step i32) (local $value f32) (local.set $env_param_offset (i32.add (i32.const 0) (local.get $env_work_offset)) ) (local.set $counter (f32.load (i32.add (i32.const 12) (local.get $env_work_offset)) ) ) (local.set $step (i32.load (i32.add (i32.const 8) (local.get $env_work_offset)) ) ) (if (i32.eq (local.get $step) (i32.const -1)) (return (f32.const 0)) ) (local.set $value (f32.load (i32.add (i32.const 16) (local.get $env_work_offset)) ) ) (block $main (block $do_release (block $do_decay (block $do_attack (br_table $do_attack $do_decay $main $do_release (local.get $step) ) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 8)) (local.get $counter) ) ) (f32.load (i32.add (i32.const 4) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const 1) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (local.tee $value (f32.const 1) ) ) ) (else (f32.store (i32.add (i32.const 16) (local.get $env_work_offset) ) (local.tee $value (f32.add (local.get $value) (f32.load (i32.add(i32.const 20) (local.get $env_param_offset))) ) ) ) ) ) (br $main) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 8)) (local.get $counter) ) ) (f32.load (i32.add(i32.const 8) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const 2) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (local.tee $value (f32.load (i32.add (i32.const 12) (local.get $env_param_offset)) ) ) ) ) (else (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (local.tee $value (f32.sub (local.get $value) (f32.load (i32.add (i32.const 24) (local.get $env_param_offset))) ) ) ) ) ) (br $main) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 8)) (local.get $counter) ) ) (f32.load (i32.add(i32.const 16) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (i32.const -1) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (local.tee $value (f32.const 0)) ) ) (else (f32.store (i32.add (i32.const 16) (local.get $env_work_offset)) (local.tee $value (f32.sub (local.get $value) (f32.load (i32.add (i32.const 24) (local.get $env_param_offset))) ) ) ) ) ) (br $main) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.get $counter) )  (return (f32.mul (local.get $value) (f32.load (i32.add (i32.const 0) (local.get $env_param_offset))) ) ) )  (func $keyOnTimbre (param $timbre_work_offset i32)  (i32.store (i32.add (i32.const 0) (local.get $timbre_work_offset) ) (i32.or (i32.load (i32.add (i32.const 0) (local.get $timbre_work_offset) ) ) (i32.const 0x1) ) )   (call $keyOnEnvelope (i32.add (i32.const 140) (local.get $timbre_work_offset) ) )  (call $keyOnEnvelope (i32.add (i32.const 288) (local.get $timbre_work_offset) ) ) ) (func $keyOffTimbre (param $timbre_work_offset i32)  (i32.store (i32.add (i32.const 0) (local.get $timbre_work_offset) ) (i32.and (i32.load (i32.add (i32.const 0) (local.get $timbre_work_offset) ) ) (i32.const 0xffff_fffe) ) )   (call $keyOffEnvelope (i32.add (i32.const 140) (local.get $timbre_work_offset) ) )  (call $keyOffEnvelope (i32.add (i32.const 288) (local.get $timbre_work_offset) ) ) ) (func $processTimbre (param $timbre_work_offset i32) (result f32) (local $oscillator_work_offset i32) (local $pitch_lfo_work_offset i32) (local $amplitude_lfo_work_offset i32) (local $pitch f32) (local $oscillator_offset i32) (local $timbre_flag i32) (local.set $timbre_flag (i32.load (i32.add (i32.const 0) (i32.load (i32.add (i32.const 4) (local.get $timbre_work_offset) ) ) ) ) ) (local.set $oscillator_offset (i32.load (i32.add (i32.const 0) (i32.add (i32.const 12) (local.get $timbre_work_offset) ) ) ) )   (f32.store (i32.add (i32.const 8) (local.tee $oscillator_work_offset (i32.add (i32.const 12) (local.get $timbre_work_offset) ) ) ) (f32.mul (f32.mul  (local.tee $pitch (f32.load (i32.add (i32.const 8) (local.get $timbre_work_offset) ) ) )  (if (result f32) (i32.and (local.get $timbre_flag) (i32.const 0x2) ) (then (call_indirect (type $oscillatorFunc) (local.tee $pitch_lfo_work_offset (i32.add (i32.const 160) (local.get $timbre_work_offset) ) ) (i32.load (i32.add (i32.const 4) (i32.load (i32.add (i32.const 0) (local.get $pitch_lfo_work_offset) ) ) ) ) ) ) (else (f32.const 1) ) ) )  (if (result f32) (i32.and (local.get $timbre_flag) (i32.const 0x1) ) (then (call $doEnvelope (i32.load (i32.add (i32.const 140) (local.get $timbre_work_offset) ) ) ) ) (else (f32.const 1) ) ) ) )   (f32.store (i32.add (i32.const 644) (local.get $timbre_work_offset) ) (f32.mul (f32.mul (f32.mul  (call_indirect (type $oscillatorFunc) (local.get $oscillator_work_offset) (i32.load (i32.add (i32.const 4) (local.get $oscillator_offset) ) ) )  (if (result f32) (i32.and (local.get $timbre_flag) (i32.const 0x8) ) (then (call_indirect (type $oscillatorFunc) (local.tee $amplitude_lfo_work_offset (i32.add (i32.const 308) (local.get $timbre_work_offset) ) ) (i32.load (i32.add (i32.const 4) (i32.load (i32.add (i32.const 0) (local.get $amplitude_lfo_work_offset) ) ) ) ) ) ) (else (f32.const 1) ) ) )  (if (result f32) (i32.and (local.get $timbre_flag) (i32.const 0x4) ) (then (call $doEnvelope (i32.load (i32.add (i32.const 288) (local.get $timbre_work_offset) ) ) ) ) (else (f32.const 1) ) ) )  (f32.load (i32.add (i32.const 640) (local.get $timbre_work_offset) ) ) ) )  (f32.load (i32.add (i32.const 644) (local.get $timbre_work_offset) ) ) )    (func $initOutputBuffer (param $size i32) (result i32) (local $offset i32) (i32.store (i32.const 15308) (local.tee $offset (call $allocateMemory (local.get $size) ) ) ) (local.get $offset) )    (func $initTestTimbre (result i32) (local $loop_counter i32) (local $offset_src i32) (local $offset_dest i32) (local $oscillator_offset i32) (local $timbre_offset i32)  (i32.store (i32.const 12) (local.tee $oscillator_offset (call $allocateWaveTable (i32.const 32) ) ) )  (block $sin_data_copy (local.set $loop_counter (i32.const 32)) (local.set $offset_src (i32.const 15312)) (local.set $offset_dest (i32.add (i32.const 16) (i32.load (i32.const 12) ) ) ) (loop $sin_loop (br_if $sin_data_copy (i32.eqz (local.tee $loop_counter (i32.sub (local.get $loop_counter) (i32.const 1) ) ) ) ) (f32.store (local.get $offset_dest) (f32.load (local.get $offset_src)) ) (local.set $offset_dest (i32.add (local.get $offset_dest) (i32.const 4) ) ) (local.set $offset_src (i32.add (local.get $offset_src) (i32.const 4) ) ) (br $sin_loop) ) )   (i32.store (i32.const 140) (i32.const 4) )  (i32.store (i32.const 144) (local.get $oscillator_offset) ) (f32.store (i32.const 148) (f32.const 440)  )  (call $initEnvelope (i32.const 152) (f32.load (i32.const 4)) (f32.const 2.0)  (f32.const 2.0)  (f32.const 1.0)  (f32.const 2.0)  (f32.const 1.0)  )  (i32.store (i32.const 184) (local.get $oscillator_offset) ) (f32.store (i32.const 188) (f32.const 20)  )  (call $initEnvelope (i32.const 192) (f32.load (i32.const 4)) (f32.const 0.0) (f32.const 2.0) (f32.const 0.5) (f32.const 2.0) (f32.const 1.0) )  (i32.store (i32.const 224) (local.get $oscillator_offset) ) (f32.store (i32.const 228) (f32.const 20)  )   (i32.store (i32.const 10124) (i32.const 0x80000000) )  (i32.store (i32.const 10128) (i32.const 140) )  (f32.store (i32.const 10132) (f32.const 1) )  (call $initWaveTableWork (i32.const 10136) (local.get $oscillator_offset) (f32.load (i32.const 148) ) )  (call $initWaveTableWork (i32.const 10284) (local.get $oscillator_offset) (f32.load (i32.const 188) ) )  (call $initWaveTableWork (i32.const 10432) (local.get $oscillator_offset) (f32.load (i32.const 228) ) )  (call $initEnvelopeWork (i32.const 10264) (i32.const 152) )  (call $initEnvelopeWork (i32.const 10412) (i32.const 192) )  (f32.store (i32.const 10764) (f32.const 1) ) (i32.const 10124) )       (func $lowPassFilter (param $filter_work i32) (local $filter_param i32) (local $omega f32) (local $cos_omega f32) (local $alpha f32)  (local.set $filter_param (i32.load (local.get $filter_param) ) )  (local.set $cos_omega (f32.demote_f64 (call $cos (f64.promote_f32 (local.tee $omega (f32.mul (f32.mul (f32.const 6.283185307179586) (f32.load (i32.add (i32.const 32) (local.get $filter_work) ) ) ) (f32.load (i32.const 8)) ) ) ) ) ) )  (local.set $alpha (f32.div (f32.demote_f64 (call $sin (f64.promote_f32 (local.get $omega))) ) (f32.mul (f32.const 2.0) (f32.load (i32.add (i32.const 12) (local.get $filter_param) ) ) ) ) )   (f32.store (i32.add (i32.const 4) (local.get $filter_work) ) (f32.add (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 8) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 12) (local.get $filter_work) ) (f32.sub (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 16) (local.get $filter_work) ) (f32.mul (f32.sub (f32.const 1.0) (local.get $cos_omega) ) (f32.const 0.5) ) )  (f32.store (i32.add (i32.const 20) (local.get $filter_work) ) (f32.sub (f32.const 1.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 24) (local.get $filter_work) ) (f32.load (i32.add (i32.const 16) (local.get $filter_work) ) ) ) )  (func $highPassFilter (param $filter_work i32) (local $filter_param i32) (local $omega f32) (local $cos_omega f32) (local $alpha f32)  (local.set $filter_param (i32.load (local.get $filter_param) ) )  (local.set $cos_omega (f32.demote_f64 (call $cos (f64.promote_f32 (local.tee $omega (f32.mul (f32.mul (f32.const 6.283185307179586) (f32.load (i32.add (i32.const 32) (local.get $filter_work) ) ) ) (f32.load (i32.const 8)) ) ) ) ) ) )  (local.set $alpha (f32.div (f32.demote_f64 (call $sin (f64.promote_f32 (local.get $omega))) ) (f32.mul (f32.const 2.0) (f32.load (i32.add (i32.const 12) (local.get $filter_param) ) ) ) ) )   (f32.store (i32.add (i32.const 4) (local.get $filter_work) ) (f32.add (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 8) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 12) (local.get $filter_work) ) (f32.sub (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 16) (local.get $filter_work) ) (f32.mul (f32.sub (f32.const 1.0) (local.get $cos_omega) ) (f32.const 0.5) ) )  (f32.store (i32.add (i32.const 20) (local.get $filter_work) ) (f32.add (f32.const -1.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 24) (local.get $filter_work) ) (f32.load (i32.add (i32.const 16) (local.get $filter_work) ) ) ) )  (func $notchFilter (param $filter_work i32) (local $filter_param i32) (local $omega f64) (local $cos_omega f32) (local $sin_omega f64) (local $alpha f32)  (local.set $filter_param (i32.load (local.get $filter_param) ) )  (local.set $cos_omega (f32.demote_f64 (call $cos (local.tee $omega (f64.promote_f32 (f32.mul (f32.mul (f32.const 6.283185307179586) (f32.load (i32.add (i32.const 32) (local.get $filter_work) ) ) ) (f32.load (i32.const 8)) ) ) ) ) ) )  (local.set $sin_omega (call $sin (local.get $omega)) ) (local.set $alpha (f32.demote_f64 (f64.mul (local.get $sin_omega) (call $sinh (f64.div (f64.mul (f64.mul (f64.const 0.34657359027997264) (f64.promote_f32 (f32.load (i32.add (i32.const 16) (local.get $filter_work) ) ) ) ) (local.get $omega) ) (local.get $sin_omega) ) ) ) ) )   (f32.store (i32.add (i32.const 4) (local.get $filter_work) ) (f32.add (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 8) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 12) (local.get $filter_work) ) (f32.sub (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 16) (local.get $filter_work) ) (f32.const 1) )  (f32.store (i32.add (i32.const 20) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 24) (local.get $filter_work) ) (f32.const 1) ) )  (func $bandPassFilter (param $filter_work i32) (local $filter_param i32) (local $omega f64) (local $cos_omega f32) (local $sin_omega f64) (local $alpha f32)  (local.set $filter_param (i32.load (local.get $filter_param) ) )  (local.set $cos_omega (f32.demote_f64 (call $cos (local.tee $omega (f64.promote_f32 (f32.mul (f32.mul (f32.const 6.283185307179586) (f32.load (i32.add (i32.const 32) (local.get $filter_work) ) ) ) (f32.load (i32.const 8)) ) ) ) ) ) )  (local.set $sin_omega (call $sin (local.get $omega)) ) (local.set $alpha (f32.demote_f64 (f64.mul (local.get $sin_omega) (call $sinh (f64.div (f64.mul (f64.mul (f64.const 0.34657359027997264) (f64.promote_f32 (f32.load (i32.add (i32.const 16) (local.get $filter_work) ) ) ) ) (local.get $omega) ) (local.get $sin_omega) ) ) ) ) )   (f32.store (i32.add (i32.const 4) (local.get $filter_work) ) (f32.add (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 8) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (local.get $cos_omega) ) )  (f32.store (i32.add (i32.const 12) (local.get $filter_work) ) (f32.sub (f32.const 1.0) (local.get $alpha) ) )  (f32.store (i32.add (i32.const 16) (local.get $filter_work) ) (local.get $alpha) )  (f32.store (i32.add (i32.const 20) (local.get $filter_work) ) (f32.const 0) )  (f32.store (i32.add (i32.const 24) (local.get $filter_work) ) (local.get $alpha) ) )   (func $lowShelfFilter (param $filter_work i32) (local $filter_param i32) (local $omega f64) (local $cos_omega f32) (local $sin_omega f32) (local $alpha f32) (local $A f32) (local $beta f32)  (local.set $filter_param (i32.load (local.get $filter_param) ) )  (local.set $cos_omega (f32.demote_f64 (call $cos (local.tee $omega (f64.promote_f32 (f32.mul (f32.mul (f32.const 6.283185307179586) (f32.load (i32.add (i32.const 32) (local.get $filter_work) ) ) ) (f32.load (i32.const 8)) ) ) ) ) ) )  (local.set $sin_omega (f32.demote_f64 (call $sin (local.get $omega)) ) ) (local.set $alpha (f32.div (local.get $sin_omega) (f32.mul (f32.const 2) (f32.load (i32.add (i32.const 12) (local.get $filter_param) ) ) ) ) )  (local.set $A (f32.demote_f64 (call $pow (f64.const 10.0) (f64.mul (f64.promote_f32 (f32.load (i32.add (i32.const 20) (local.get $filter_param) ) ) ) (f64.const 0.025) ) ) ) )  (local.set $beta (f32.demote_f64 (f64.div (f64.sqrt (f64.promote_f32 (local.get $A) ) ) (f64.promote_f32 (f32.load (i32.add (i32.const 12) (local.get $filter_param) ) ) ) ) ) )   (f32.store (i32.add (i32.const 4) (local.get $filter_work) ) (f32.add (f32.add (local.get $A) (f32.const 1) ) (f32.add (f32.mul (f32.sub (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) (f32.mul (local.get $beta) (local.get $sin_omega) ) ) ) )  (f32.store (i32.add (i32.const 8) (local.get $filter_work) ) (f32.mul (f32.const -2.0) (f32.add (f32.sub (local.get $A) (f32.const 1) ) (f32.mul (f32.add (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) ) ) )  (f32.store (i32.add (i32.const 12) (local.get $filter_work) ) (f32.add (f32.add (local.get $A) (f32.const 1) ) (f32.sub (f32.mul (f32.sub (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) (f32.mul (local.get $beta) (local.get $sin_omega) ) ) ) )  (f32.store (i32.add (i32.const 16) (local.get $filter_work) ) (f32.mul (local.get $A) (f32.sub (f32.add (local.get $A) (f32.const 1) ) (f32.add (f32.mul (f32.sub (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) (f32.mul (local.get $beta) (local.get $sin_omega) ) ) ) ) )  (f32.store (i32.add (i32.const 20) (local.get $filter_work) ) (f32.mul (f32.mul (f32.const 2.0) (local.get $A) ) (f32.sub (f32.sub (local.get $A) (f32.const 1) ) (f32.mul (f32.add (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) ) ) )  (f32.store (i32.add (i32.const 24) (local.get $filter_work) ) (f32.mul (local.get $A) (f32.sub (f32.add (local.get $A) (f32.const 1) ) (f32.sub (f32.mul (f32.sub (local.get $A) (f32.const 1) ) (local.get $cos_omega) ) (f32.mul (local.get $beta) (local.get $sin_omega) ) ) ) ) ) ) ) 