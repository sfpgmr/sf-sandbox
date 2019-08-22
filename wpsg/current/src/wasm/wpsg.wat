(module (export "setRate" (func $set_rate)) (export "initEnvelope" (func $initEnvelope)) (export "initEnvWork" (func $initEnvWork)) (export "keyOnEnvelope" (func $keyOnEnvelope)) (export "keyOffEnvelope" (func $KeyOffEnvelope)) (export "doEnvelope" (func $doEnvelope)) (import "env" "memory" (memory $memory 1 10 shared))              (func $set_rate (param $r f32) (f32.store (i32.const 52) (local.get $r) ) (f32.store (i32.const 56) (f32.div (f32.const 1) (local.get $r) ) ) )   (func $initEnvelope (param $env_param_offset i32) (param $sample_rate f32)  (f32.store (i32.add (i32.const 24) (local.get $env_param_offset)) (f32.div (f32.const 1) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 8) (local.get $env_param_offset))) ) ) )  (f32.store (i32.add (i32.const 28) (local.get $env_param_offset)) (f32.div (f32.sub (f32.const 1) (f32.load (i32.add (i32.const 16) (local.get $env_param_offset))) ) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 12) (local.get $env_param_offset))) ) ) )  (f32.store (i32.add (i32.const 32) (local.get $env_param_offset)) (f32.div (f32.load (i32.add (i32.const 16) (local.get $env_param_offset))) (f32.mul (local.get $sample_rate) (f32.load (i32.add (i32.const 20) (local.get $env_param_offset))) ) ) ) ) (func $initEnvWork (param $env_work_offset i32)  (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (f32.const 0) )  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 0) )  (i32.store (i32.add (i32.const 0) (local.get $env_work_offset)) (i32.const 0) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (f32.const 0) ) ) (func $keyOnEnvelope (param $env_work_offset i32)  (i32.store (i32.add (i32.const 0) (local.get $env_work_offset)) (i32.or (i32.const 0x80000000) (i32.load (i32.add (i32.const 0) (local.get $env_work_offset))) ) )  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 0) )  (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (f32.const 0) )  (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (f32.const 0) ) ) (func $KeyOffEnvelope (param $env_work_offset i32)  (i32.store (i32.add (i32.const 0) (local.get $env_work_offset)) (i32.and (i32.const 0x7fffffff) (i32.load (i32.add (i32.const 0) (local.get $env_work_offset))) ) )  (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 3) )  (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (f32.const 0) ) ) (func $doEnvelope (param $env_param_offset i32) (param $env_work_offset i32) (result f32) (local $counter f32) (local $step i32) (local $value f32) (local.set $counter (f32.load (i32.add (i32.const 8) (local.get $env_work_offset)) ) ) (local.set $step (i32.load (i32.add (i32.const 4) (local.get $env_work_offset)) ) ) (if (i32.eq (local.get $step) (i32.const -1)) (return (f32.const 0)) ) (local.set $value (f32.load (i32.add (i32.const 12) (local.get $env_work_offset)) ) ) (block $main (block $do_release (block $do_decay (block $do_attack (br_table $do_attack $do_decay $main $do_release (local.get $step) ) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 56)) (local.get $counter) ) ) (f32.load (i32.add (i32.const 8) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 1) ) (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $value (f32.const 1) ) ) ) (else (f32.store (i32.add (i32.const 12) (local.get $env_work_offset) ) (local.tee $value (f32.add (local.get $value) (f32.load (i32.add(i32.const 24) (local.get $env_param_offset))) ) ) ) ) ) (br $main) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 56)) (local.get $counter) ) ) (f32.load (i32.add(i32.const 12) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const 2) ) (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $value (f32.load (i32.add (i32.const 16) (local.get $env_param_offset)) ) ) ) ) (else (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $value (f32.sub (local.get $value) (f32.load (i32.add (i32.const 28) (local.get $env_param_offset))) ) ) ) ) ) (br $main) )  (if (f32.ge (local.tee $counter (f32.add (f32.load (i32.const 56)) (local.get $counter) ) ) (f32.load (i32.add(i32.const 20) (local.get $env_param_offset))) ) (then (i32.store (i32.add (i32.const 4) (local.get $env_work_offset)) (i32.const -1) ) (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (local.tee $counter (f32.const 0) ) ) (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $value (f32.const 0)) ) ) (else (f32.store (i32.add (i32.const 12) (local.get $env_work_offset)) (local.tee $value (f32.sub (local.get $value) (f32.load (i32.add (i32.const 28) (local.get $env_param_offset))) ) ) ) ) ) (br $main) ) (f32.store (i32.add (i32.const 8) (local.get $env_work_offset)) (local.get $counter) ) (return (f32.mul (local.get $value) (f32.load (i32.add (i32.const 4) (local.get $env_param_offset))) ) ) ) ) 