
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; 波形メモリ音源
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


(; $.OSC_FUNC_INDEX = 0;
  $.OSC_CREATE_FUNC_INDEX = 1;
  $.FILTER_FUNC_INDEX = 8;
  $.PIx2 = Math.PI * 2;
  $.FIXED_POINT = 16;
  $.FIXED_POINT_SHIFT = 1 << $.FIXED_POINT;
 ;)










(module
  (type $oscillatorFunc (func (param i32) (result f32)))
  (type $filterFunc (func (param i32)))
;;  (memory $memory (export "memory") 1 10 shared)

  (import "env" "memory" (memory $memory 20 20 shared))

  (import "imports" "sin" (func $sin (param $a f64) (result f64)))
  (import "imports" "cos" (func $cos (param $a f64) (result f64)))
  (import "imports" "sinh" (func $sinh (param $a f64) (result f64)))
  (import "imports" "exp" (func $exp (param $a f64) (result f64)))
  (import "imports" "pow" (func $pow (param $a f64) (param $b f64) (result f64)))

  (export "setRate" (func $set_rate))
  (export "initEnvelope" (func $initEnvelope))
  (export "updateEnvelope" (func $updateEnvelope))
  (export "initEnvelopeWork" (func $initEnvelopeWork))
  (export "keyOnEnvelope" (func $keyOnEnvelope))
  (export "keyOffEnvelope" (func $keyOffEnvelope))
  (export "doEnvelope" (func $doEnvelope))

  
  (export "initMemory" (func $initMemory))
  (export "allocateMemory" (func $allocateMemory))
  (export "freeMemory" (func $freeMemory))

  (export "initWaveTable" (func $initWaveTable))
  (export "allocateWaveTable" (func $allocateWaveTable))
  (export "initWaveTableWork" (func $initWaveTableWork))
  (export "readWaveTable"  (func $readWaveTable))
  (export "setWaveTableSize" (func $setWaveTableSize))

  (export "initFilter" (func $initFilter))
  (export "initFilterWork" (func $initFilterWork))


  (export "initTestTimbre" (func $initTestTimbre))
  (export "processTimbre" (func $processTimbre))
  (export "keyOnTimbre" (func $keyOnTimbre))
  (export "keyOffTimbre" (func $keyOffTimbre))

  (export "initOutputBuffer" (func $initOutputBuffer))
  (export "process" (func $process))
  (export "fill" (func $fill))

  (table 32 funcref)
  (elem (i32.const (; $.OSC_FUNC_INDEX ;)0) $readWaveTable)
  ;;(elem (i32.const {$.OSC_CREATE_FUNC_INDEX}) $createWaveTable)
  (elem 
    (i32.const (; $.FILTER_FUNC_INDEX ;)8) 
    $lowPassFilter $highPassFilter $bandPassFilter  $notchFilter $lowShelfFilter $HighShelfFilter $PeakingFilter $allPassFilter
  )

 

(;
###############################################################

Envelope Generator
    decay
   /\   sustain
  /  \_________   
 /             |\
/              | \
attack        release
|              |
keyon          keyoff

Envelope .... エンベロープのパラメータ格納用
EnvelopeWork .... エンベロープのインスタンス制御用ワーク

###############################################################
;)





;; -----------------------
;; オシレータ抽象化構造体
;; -----------------------

;; パラメータ


;; ワークエリア
;; ワークエリアは１音につき128バイト割り当てられる



;; --------------------------
;; 波形メモリオシレータ
;; いわゆるwsgとかsccみたいなの
;; --------------------------

;; 波形メモリ・パラメータ


;; 波形メモリ・ワークエリア


;; --------------------------
;; 波形メモリオシレータ（サンプラタイプ）  
;; まだ手をつけていない
;; --------------------------





;; --------------------------
;; フィルター
;; --------------------------





;; -----------------------
;; LFO 
;; -----------------------



;; -----------------------
;; 音色
;; -----------------------

;; 音色・パラメータ


;; 音色ワークエリア


;; --------------------------------
;; メモリマップ 
;; --------------------------------

(data (i32.const 15072) "\00\00\00\00\c2\c5\47\3e\15\ef\c3\3e\da\39\0e\3f\f3\04\35\3f\31\db\54\3f\5e\83\6c\3f\be\14\7b\3f\00\00\80\3f\be\14\7b\3f\5e\83\6c\3f\31\db\54\3f\f3\04\35\3f\da\39\0e\3f\15\ef\c3\3e\c2\c5\47\3e\32\31\0d\25\c2\c5\47\be\15\ef\c3\be\da\39\0e\bf\f3\04\35\bf\31\db\54\bf\5e\83\6c\bf\be\14\7b\bf\00\00\80\bf\be\14\7b\bf\5e\83\6c\bf\31\db\54\bf\f3\04\35\bf\da\39\0e\bf\15\ef\c3\be\c2\c5\47\be")


;; -----------------------------------
;; 簡易メモリアロケータ 
;; 取ったら取りっぱなしのメモリアロケータ
;; ------------------------------------

;; メモリ初期化
(func $initMemory
  (i32.store
    (i32.const 0 (; alloc_mem_offset ;))
    (i32.const 15200 (; mem_start ;))  
  )
)

  ;; メモリのアロケート
  (func $allocateMemory
  (param $size i32)
  (result i32)
  (local $mem_offset i32)
  (local $mem_offset_before i32)
  (local $mem_page i32)

  ;; 8 byte 境界にそろえる
  (local.set $size
    (i32.and
      (i32.add
        (local.get $size)
        (i32.const 0x7)
      )
      (i32.const 0xffff_fff8)
    )    
  )

  (if
    (i32.gt_u
      (local.tee $mem_page
        (i32.add
          (i32.shr_u
            (local.tee $mem_offset
              (i32.add 
                (local.get $size) 
                (local.tee $mem_offset_before
                  (i32.load (i32.const 0 (; alloc_mem_offset ;)))
                )
              )
            )
            (i32.const 16)
          )
          (i32.const 1)
        )
      )
      (memory.size)
    )

    (then
      ;;メモリが足りない場合、必要な分だけページを拡張する
      (memory.grow
        (i32.const 2)
        ;; (i32.sub
        ;;   (local.get $mem_page)
        ;;   (memory.size)
        ;; )
      )
      (drop)
    )
  )

  (i32.store
    (i32.const 0 (; alloc_mem_offset ;))
    (local.get $mem_offset)
  )
  (local.get $mem_offset_before)
)

;; 指定オフセットからのメモリを開放する
(func $freeMemory
  (param $offset i32)
  (i32.store
    (i32.const 0 (; alloc_mem_offset ;))
    (local.get $offset)
  )
)

;; ----------------------
;; サンプリング周波数の設定
;; ----------------------

(func $set_rate (param $r f32) 
  (f32.store (i32.const 4 (; sample_rate ;)) 
    (local.get $r)
  )
  (f32.store (i32.const 8 (; delta ;))
    (f32.div
      (f32.const 1)
      (local.get $r)
    )
  )
)


;; -----------------------------------
;;  Wave Table
;; -----------------------------------

;; size update method 


;; # wave tableの初期化 #
(func $initWaveTable
  ;; メモリオフセット
  (param $wave_table_offset i32)
  ;; サイズ（２のべき乗単位で指定）
  (param $size i32)

  (i32.store 
    
(i32.add
  (i32.const 0 (; WaveTable.base.oscillator_type ;))
  (local.get $wave_table_offset)
)
 
    (i32.const 0)
  )

  


(i32.store
  
(i32.add
  (i32.const 8 (; WaveTable.size ;))
  (local.get $wave_table_offset)
)

  (local.get $size)
)



(i64.store
  
(i32.add
  (i32.const 12 (; WaveTable.wave_size_mask ;))
  (local.get $wave_table_offset)
)

  (i64.sub
    (i64.shl
      (i64.extend_i32_u (local.get $size))
      (i64.const (; $.FIXED_POINT ;)16)
    )
    (i64.const +1)
  )

)



  ;; 初期化メソッド・音声処理メソッドへのインデックス
  (i32.store
    
(i32.add
  (i32.const 4 (; Oscillator.call_index ;))
  (local.get $wave_table_offset)
)

    (i32.const 0)
  )
)



(func $setWaveTableSize
  (param $wave_table_offset i32)
  (param $size i32)
  


(i32.store
  
(i32.add
  (i32.const 8 (; WaveTable.size ;))
  (local.get $wave_table_offset)
)

  (local.get $size)
)



(i64.store
  
(i32.add
  (i32.const 12 (; WaveTable.wave_size_mask ;))
  (local.get $wave_table_offset)
)

  (i64.sub
    (i64.shl
      (i64.extend_i32_u (local.get $size))
      (i64.const (; $.FIXED_POINT ;)16)
    )
    (i64.const +1)
  )

)


)

;; # wave table用メモリのアロケートと初期化 #
(func $allocateWaveTable
  (param $data_size i32)
  (result i32)
  (local $offset i32)

  (call $initWaveTable
    (local.tee $offset
      (call $allocateMemory
        (i32.add
          (local.get $data_size)
          (i32.const 20 (; WaveTable - 4 ;))
        )    
      )
    )
    (local.get $data_size)
  )

  (local.get $offset)
)











;; # wave table workの初期化 #
(func $initWaveTableWork
  (param $wave_table_work_offset i32)
  (param $wave_table_offset i32)
  (param $base_frequency f32)
  (local $base_frequency_i64 i64)
  

  (local.set $base_frequency_i64
    (i64.trunc_f32_u
      (local.get $base_frequency)
    )
  )

  
(i64.store
  
(i32.add
  (i32.const 16 (; WaveTableWork.base.sample_rate ;))
  (local.get $wave_table_work_offset)
)

  (i64.trunc_f32_u
      (f32.load (i32.const 4 (; sample_rate ;)))
    )
  
)


  
(i64.store
  
(i32.add
  (i32.const 32 (; WaveTableWork.base_frequency ;))
  (local.get $wave_table_work_offset)
)

  (local.get $base_frequency_i64)
  
)


  
(f32.store
  
(i32.add
  (i32.const 12 (; OscillatorWork.level ;))
  (local.get $wave_table_work_offset)
)

  (f32.const +1)
  
)


  ;;pitch
  
(f32.store
  
(i32.add
  (i32.const 8 (; WaveTableWork.base.pitch ;))
  (local.get $wave_table_work_offset)
)

  (f32.const +1)
  
)


  ;; {@@sto i64,&WaveTableWork.pitch_work;,$wave_table_work_offset,
  ;;   (i64.const {$.FIXED_POINT_SHIFT})
  ;; }

  
(i64.store
  
(i32.add
  (i32.const 48 (; WaveTableWork.delta ;))
  (local.get $wave_table_work_offset)
)

  

(i64.div_u
  (i64.shl
    
(i64.shr_u 
  (i64.mul 
(i64.shl 
  (local.get $base_frequency_i64)
  (i64.const (; $.FIXED_POINT ;)16)
)
 
(i64.shl 
  (i64.extend_i32_u
        
(i32.load
  
(i32.add
  (i32.const 8 (; WaveTable.size ;))
  (local.get $wave_table_offset)
)

)

      )
    
  (i64.const (; $.FIXED_POINT ;)16)
)

  )
  (i64.const (; $.FIXED_POINT ;)16)
)

    (i64.const (; $.FIXED_POINT ;)16)
  )
  
(i64.shl 
  
(i64.load
  
(i32.add
  (i32.const 16 (; WaveTableWork.base.sample_rate ;))
  (local.get $wave_table_work_offset)
)

)

  
  (i64.const (; $.FIXED_POINT ;)16)
)


)


  
)


  
(i64.store
  
(i32.add
  (i32.const 40 (; WaveTableWork.table_index ;))
  (local.get $wave_table_work_offset)
)

  (i64.const +0)
  
)


  ;; value
  
(f32.store
  
(i32.add
  (i32.const 24 (; WaveTableWork.base.value ;))
  (local.get $wave_table_work_offset)
)

  (f32.const +0)
  
)

 
  ;; wave tableへのオフセット
  
(i32.store
  
(i32.add
  (i32.const 0 (; WaveTableWork.base.param_offset ;))
  (local.get $wave_table_work_offset)
)

  (local.get $wave_table_offset)
  
)

)

;; # wave data の読み出し #
(func $readWaveTable (type $oscillatorFunc)
  (param $wave_table_work_offset i32)
  (result f32)
  (local $wave_table_offset i32)
  (local $table_index i64)
  (local $delta i64)
  (local $value f32)

  (local.set $wave_table_offset
    
(i32.load
  
(i32.add
  (i32.const 0 (; WaveTableWork.base.param_offset ;))
  (local.get $wave_table_work_offset)
)

)
 
  )


  (local.set $table_index
    
(i64.load
  
(i32.add
  (i32.const 40 (; WaveTableWork.table_index ;))
  (local.get $wave_table_work_offset)
)

)
    
  )

  (local.set $delta
    
(i64.shr_u 
  (i64.mul 
(i64.load
  
(i32.add
  (i32.const 48 (; WaveTableWork.delta ;))
  (local.get $wave_table_work_offset)
)

)
 (i64.trunc_f32_u
        (f32.mul
          
(f32.load
  
(i32.add
  (i32.const 8 (; WaveTableWork.base.pitch ;))
  (local.get $wave_table_work_offset)
)

)

          (f32.const (; $.FIXED_POINT_SHIFT ;)65536)
        )
      )
    )
  (i64.const (; $.FIXED_POINT ;)16)
)

  )

  
(i64.store
  
(i32.add
  (i32.const 40 (; WaveTableWork.table_index ;))
  (local.get $wave_table_work_offset)
)

  (local.tee $table_index
      (i64.and
        (i64.add
          (local.get $table_index)
          (local.get $delta)
        )
        
(i64.load
  
(i32.add
  (i32.const 12 (; WaveTable.wave_size_mask ;))
  (local.get $wave_table_offset)
)

)

      )
    )
  
)


  (f32.store 
    
(i32.add
  (i32.const 24 (; WaveTableWork.base.value ;))
  (local.get $wave_table_work_offset)
)

    (local.tee $value
      (f32.mul
        (f32.load
          
(i32.add
  (i32.const 12 (; OscillatorWork.level ;))
  (local.get $wave_table_work_offset)
)

        )
        (f32.load
          (i32.add
            (i32.shl
              (i32.wrap_i64
                (i64.shr_u
                  (local.get $table_index)
                  (i64.const (; $.FIXED_POINT ;)16)
                )
              )
              (i32.const 2)
            )
            (i32.add
              (i32.const 20 (; WaveTable.wave_data_start ;))
              (local.get $wave_table_offset)
            )
          )
        )
      )
    )
  )

  (local.get $value)

)

;; -------------------------------------
;;  エンベロープジェネレータ 
;; -------------------------------------

;; ## 初期化 ##
(func $initEnvelope 
  (param $env_param_offset i32)
  (param $sample_rate f32)
  (param $attack_time f32)
  (param $decay_time f32)
  (param $sustain_level f32)
  (param $release_time f32)
  (param $level f32)
  

  ;; attack ;;

  (f32.store
    (i32.add (i32.const 4 (; Envelope.attack_time ;)) (local.get $env_param_offset))
    (local.get $attack_time)
  )

  (f32.store 
    (i32.add (i32.const 20 (; Envelope.attack_delta ;)) (local.get $env_param_offset))
    (f32.div (f32.const 1)
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 4 (; Envelope.attack_time ;)) (local.get $env_param_offset)))
      )
    )
  )

  ;; decay ;;;;;;;;

  (f32.store
    (i32.add (i32.const 8 (; Envelope.decay_time ;)) (local.get $env_param_offset))
    (local.get $decay_time)
  )

  (f32.store 
    (i32.add (i32.const 24 (; Envelope.decay_delta ;)) (local.get $env_param_offset))
    (f32.div 
      (f32.sub 
        (f32.const 1) 
        (f32.load (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset)))
      )
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 8 (; Envelope.decay_time ;)) (local.get $env_param_offset)))
      )
    )
  )

  ;; sustain ;;

  (f32.store
    (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset))
    (local.get $sustain_level)
  )

  ;; release ;;

  (f32.store
    (i32.add (i32.const 16 (; Envelope.release_time ;)) (local.get $env_param_offset))
    (local.get $release_time)
  )

  (f32.store 
    (i32.add (i32.const 28 (; Envelope.release_delta ;)) (local.get $env_param_offset))
    (f32.div (f32.load (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset)))
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 16 (; Envelope.release_time ;)) (local.get $env_param_offset)))
      )
    )
  )

  (f32.store
    (i32.add (i32.const 0 (; Envelope.level ;)) (local.get $env_param_offset))
    (local.get $level)
  )
)

  ;; ## 初期化 ##
(func $updateEnvelope 
  (param $env_param_offset i32)
  (local $sample_rate f32)

  (local.set $sample_rate
    (f32.load (i32.const 4 (; sample_rate ;)))
  )
  

  ;; attack ;;

  (f32.store 
    (i32.add (i32.const 20 (; Envelope.attack_delta ;)) (local.get $env_param_offset))
    (f32.div (f32.const 1)
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 4 (; Envelope.attack_time ;)) (local.get $env_param_offset)))
      )
    )
  )

  ;; decay ;;;;;;;;

  (f32.store 
    (i32.add (i32.const 24 (; Envelope.decay_delta ;)) (local.get $env_param_offset))
    (f32.div 
      (f32.sub 
        (f32.const 1) 
        (f32.load (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset)))
      )
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 8 (; Envelope.decay_time ;)) (local.get $env_param_offset)))
      )
    )
  )

  (f32.store 
    (i32.add (i32.const 28 (; Envelope.release_delta ;)) (local.get $env_param_offset))
    (f32.div (f32.load (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset)))
      (f32.mul 
        (local.get $sample_rate)
        (f32.load (i32.add (i32.const 16 (; Envelope.release_time ;)) (local.get $env_param_offset)))
      )
    )
  )

)

;; # エンベロープ・ワークエリアの初期化 #
(func $initEnvelopeWork 
  (param $env_work_offset i32)
  (param $env_param_offset i32)
  
  ;; envelope parameter offset
  
  (i32.store
    (i32.add (i32.const 0 (; EnvelopeWork.env_param_offset ;)) (local.get $env_work_offset))
    (local.get $env_param_offset)
  )

  ;; counter 
  (f32.store 
    (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
    (f32.const 0)
  )

  ;; step
  (i32.store 
    (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
    (i32.const -1)
  )

  ;; flag 
  (i32.store 
    (i32.add (i32.const 4 (; EnvelopeWork.flag ;)) (local.get $env_work_offset))
    (i32.const 0)
  )

  ;; value 
  (f32.store 
    (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
    (f32.const 0)
  )

)

;; ## key on 処理 ##
(func $keyOnEnvelope (param $env_work_offset i32)
  ;; flag ;;
  (i32.store 
    (i32.add (i32.const 4 (; EnvelopeWork.flag ;)) (local.get $env_work_offset))
    (i32.or (i32.const 0x80000000)
      (i32.load (i32.add (i32.const 4 (; EnvelopeWork.flag ;)) (local.get $env_work_offset)))
    )
  )
  ;; step ;;
  (i32.store 
    (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
    (i32.const 0)
  )

  ;; counter ;; 
  (f32.store 
    (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
    (f32.const 0)
  )

  ;; value ;; 
  (f32.store 
    (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
    (f32.const 0)
  )

)

;; ## key off 処理 ##
(func $keyOffEnvelope 
  (param $env_work_offset i32)
  ;; flag ;;
  (i32.store 
    (i32.add (i32.const 4 (; EnvelopeWork.flag ;)) (local.get $env_work_offset))
    (i32.and 
      (i32.const 0x7fffffff)
      (i32.load (i32.add (i32.const 4 (; EnvelopeWork.flag ;)) (local.get $env_work_offset)))
    )
  )
  ;; step ;;
  (i32.store 
    (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
    (i32.const 3)
  )
  ;; counter
  (f32.store
    (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
    (f32.const 0)
  )    
)

;; ## エンベロープ処理 ##
(func $doEnvelope 
  (param $env_work_offset i32)
  (result f32)
  (local $env_param_offset i32) 
  (local $counter f32)
  (local $step i32)
  (local $value f32)

  (local.set $env_param_offset
    (i32.load (i32.add (i32.const 0 (; EnvelopeWork.env_param_offset ;)) (local.get $env_work_offset)))
  )

  (local.set $counter 
    (f32.load 
      (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
    )
  )

  (local.set $step
    (i32.load 
      (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
    )
  )

  (if (i32.eq (local.get $step) (i32.const -1))
    (return (f32.const 0))   
  )

  (local.set $value 
    (f32.load 
      (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
    )
  )

  (block $main
    (block $do_release
        (block $do_decay
          (block $do_attack
            (br_table $do_attack $do_decay $main $do_release 
              (local.get $step)
            )
          )

          ;; ### attack ###
          (if (f32.ge            
                (local.tee $counter
                  (f32.add 
                    (f32.load (i32.const 8 (; delta ;)))
                    (local.get $counter)
                  )
                )
                (f32.load (i32.add (i32.const 4 (; Envelope.attack_time ;)) (local.get $env_param_offset)))
                )
            (then
              (i32.store
                (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
                (i32.const 1)
              )

              (f32.store
                (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
                (local.tee $counter
                  (f32.const 0)
                )
              )
              (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
                (local.tee $value 
                  (f32.const 1)
                ) 
              )
            )
            (else
              (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset) )
                (local.tee $value
                  (f32.add (local.get $value)
                    (f32.load (i32.add(i32.const 20 (; Envelope.attack_delta ;)) (local.get $env_param_offset)))
                  )
                )
              )
            )
          )
          (br $main)
        )
        ;; ### decay ###
        (if 
          (i32.or
            (f32.ge            
              (local.tee $counter
                (f32.add 
                  (f32.load (i32.const 8 (; delta ;)))
                  (local.get $counter)
                )
              )
              (f32.load (i32.add(i32.const 8 (; Envelope.decay_time ;)) (local.get $env_param_offset)))
            )
            (f32.le
              (local.get $value)
              (f32.load (i32.add(i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset)))
            )
          )
          (then
            (i32.store
              (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
              (i32.const 2)
            )

            (f32.store
              (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
              (local.tee $counter
                (f32.const 0)
              )
            )
            (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
              (local.tee $value 
                (f32.load 
                    (i32.add (i32.const 12 (; Envelope.sustain_level ;)) (local.get $env_param_offset))
                )
              ) 
            )
          )
          (else
            (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
              (local.tee $value
                (f32.sub (local.get $value)
                  (f32.load (i32.add (i32.const 24 (; Envelope.decay_delta ;)) (local.get $env_param_offset)))
                )
              )
            )
          )
        )
        (br $main)
      )
    ;; ### release ###
    (if 
      (i32.or 
        (f32.ge            
          (local.tee $counter
            (f32.add 
              (f32.load (i32.const 8 (; delta ;)))
              (local.get $counter)
            )
          )
          (f32.load (i32.add(i32.const 16 (; Envelope.release_time ;)) (local.get $env_param_offset)))
        )
        (f32.le 
          (local.get $value)
          (f32.const 0.000001)
        )
      )
      (then
        (i32.store
          (i32.add (i32.const 8 (; EnvelopeWork.step ;)) (local.get $env_work_offset))
          (i32.const -1)
        )
        (f32.store
          (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
          (local.tee $counter
            (f32.const 0)
          )
        )
        (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
          (local.tee $value (f32.const 0)) 
        )
      )
      (else
        (f32.store (i32.add (i32.const 16 (; EnvelopeWork.value ;)) (local.get $env_work_offset))
          (local.tee $value
            (f32.sub (local.get $value)
              (f32.load (i32.add (i32.const 28 (; Envelope.release_delta ;)) (local.get $env_param_offset)))
            )
          )
        )
      )
    )
    (br $main)
  )
  
  ;; カウンタを更新
  (f32.store 
    (i32.add (i32.const 12 (; EnvelopeWork.counter ;)) (local.get $env_work_offset))
    (local.get $counter)
  )

  ;; level * eg を出力 
  (return 
    (f32.mul 
      (local.get $value)
      (f32.load (i32.add (i32.const 0 (; Envelope.level ;)) (local.get $env_param_offset)))
    )
  )
)

;; --------------------------
;; 音色
;; --------------------------


(func $keyOnTimbre
  (param $timbre_work i32)
  ;; key on フラグのセット
  (i32.store
    (i32.add
      (i32.const 0 (; TimbreWork.flag ;))
      (local.get $timbre_work)
    )
    (i32.or
      (i32.load
        (i32.add
          (i32.const 0 (; TimbreWork.flag ;))
          (local.get $timbre_work)
        )
      )
      (i32.const 0x1)
    )
  )

  ;; envelopeのキーオン処理
  ;; pitch
  (call $keyOnEnvelope
    (i32.add
      (i32.const 140 (; TimbreWork.pitch_envelope ;))
      (local.get $timbre_work)
    )
  )
  ;; amplitude
  (call $keyOnEnvelope
    (i32.add
      (i32.const 288 (; TimbreWork.amplitude_envelope ;))
      (local.get $timbre_work)
    )
  )
  ;; filter
  (call $keyOnEnvelope
    (i32.add
      (i32.const 492 (; TimbreWork.filter_envelope ;))
      (local.get $timbre_work)
    )
  )
)

(func $keyOffTimbre
  (param $timbre_work i32)
  ;; key off  フラグのリセット
  (i32.store
    (i32.add
      (i32.const 0 (; TimbreWork.flag ;))
      (local.get $timbre_work)
    )
    (i32.and
      (i32.load
        (i32.add
          (i32.const 0 (; TimbreWork.flag ;))
          (local.get $timbre_work)
        )
      )
      (i32.const 0xffff_fffe)
    )
  )

  ;; envelopeのキーoff処理
  ;; pitch
  (call $keyOffEnvelope
    (i32.add
      (i32.const 140 (; TimbreWork.pitch_envelope ;))
      (local.get $timbre_work)
    )
  )
  ;; amplitude
  (call $keyOffEnvelope
    (i32.add
      (i32.const 288 (; TimbreWork.amplitude_envelope ;))
      (local.get $timbre_work)
    )
  )

  ;; filter
  (call $keyOffEnvelope
    (i32.add
      (i32.const 492 (; TimbreWork.filter_envelope ;))
      (local.get $timbre_work)
    )
  )

)

(func $processTimbre
  (param $timbre_work i32)
  (result f32)
  (local $oscillator_work_offset i32)
  (local $pitch_lfo_work_offset i32)
  (local $amplitude_lfo_work_offset i32)
  (local $filter_lfo_work_offset i32)
  (local $pitch f32)
  (local $oscillator_offset i32)
  (local $timbre_flag i32)
  (local $filter_value f32)
  (local $filter i32)
  (local $temp f32)

  (local.set $timbre_flag
    (i32.load
      (i32.add
        (i32.const 0 (; Timbre.flag ;))
        
(i32.load
  
(i32.add
  (i32.const 4 (; TimbreWork.timbre_offset ;))
  (local.get $timbre_work)
)

)

      )
    )
  )

  (local.set $oscillator_offset
    (i32.load
      (i32.add
        (i32.const 0 (; OscillatorWork.param_offset ;))
        (i32.add
          (i32.const 12 (; TimbreWork.oscillator_work_offset ;))
          (local.get $timbre_work)
        )
      )
    )
  )
  
  ;; Pitchの処理
  ;; pitch = pitch * lfo * envelope
  (f32.store
    (i32.add
      (i32.const 8 (; OscillatorWork.pitch ;))
      (local.tee $oscillator_work_offset
        
(i32.add
  (i32.const 12 (; TimbreWork.oscillator_work_offset ;))
  (local.get $timbre_work)
)

      )
    )
    (f32.mul
      
(if (result f32)
  (f32.lt
    (if (result f32)
      (f32.gt 
        (local.tee $temp
          (f32.add
          ;; pitch
          (local.tee $pitch
            (f32.load
              (i32.add
                (i32.const 8 (; TimbreWork.pitch ;))
                (local.get $timbre_work)
              )
            )
          )
          ;; lfo処理
          (if (result f32)
            (i32.and
              (local.get $timbre_flag)
              (i32.const 0x2)
            )
            (then
              (call_indirect (type $oscillatorFunc) 
                (local.tee $pitch_lfo_work_offset
                  (i32.add
                    (i32.const 160 (; TimbreWork.pitch_lfo_work_offset ;))
                    (local.get $timbre_work)
                  )
                )
                (i32.load
                  (i32.add
                    (i32.const 4 (; Oscillator.call_index ;))
                    (i32.load
                      (i32.add
                        (i32.const 0 (; OscillatorWork.param_offset ;))
                        (local.get $pitch_lfo_work_offset)
                      )            
                    )
                  )
                )
              )
            )
            (else
              (f32.const +0.0) 
            )
          )
        )
        )
        (f32.const +1.0
      )
      )
      (then
        (f32.const +1.0
      )
      )
      (else 
        (local.get $temp)
      )
    )
    (f32.const +0.0)
  )
  (then
    (f32.const +0.0)
  )
  (else
    (local.get $temp)
  )
)

      ;; envelope
      (if (result f32)
        (i32.and
          (local.get $timbre_flag)
          (i32.const 0x1)
        )
        (then
          (call $doEnvelope
            (i32.add
              (i32.const 140 (; TimbreWork.pitch_envelope ;))
              (local.get $timbre_work)
            )
          )
        )
        (else
          (f32.const 1)
        )
      )
    )
  )

  ;; フィルタ処理
  (if 
    (i32.and
      (local.get $timbre_flag)
      (i32.const 16)
    )
    
    (then
      (local.set $filter_value
        (f32.mul
          ;; filter envelope
          (if (result f32) 
            (i32.and (local.get $timbre_flag) (i32.const 32))
            (then
              (call $doEnvelope
                (i32.add
                  (i32.const 492 (; TimbreWork.filter_envelope ;))
                  (local.get $timbre_work)
                )
              )
            )
            (else 
              (f32.const 1)
            )
          )
          ;; filter lfo
          (if (result f32)
            (i32.and (local.get $timbre_flag) (i32.const 64))
            (then
              
(f32.mul
  (f32.add
    (call_indirect (type $oscillatorFunc) 
                  (local.tee $filter_lfo_work_offset
                    
(i32.add
  (i32.const 512 (; TimbreWork.filter_lfo_work_offset ;))
  (local.get $timbre_work)
)

                  )
                  (i32.load
                    (i32.add
                      (i32.const 4 (; Oscillator.call_index ;))
                      
(i32.load
  
(i32.add
  (i32.const 0 (; OscillatorWork.param_offset ;))
  (local.get $filter_lfo_work_offset)
)

)

                    )
                  )
                )
              
    (f32.const +1)
  )
  (f32.const +0.5)
)

            )
            (else 
              (f32.const 1)
            )
          )
        )
      )
      ;; フィルタの更新
      (local.set $filter
        
(i32.load
  
(i32.add
  (i32.const 436 (; TimbreWork.filter ;))
  (local.get $timbre_work)
)

)

      )

      ;; フィルタ値を更新
      
(f32.store
  
(i32.add
  (i32.const 464 (; TimbreWork.filter.freq_rate ;))
  (local.get $timbre_work)
)

  (local.get $filter_value)
      
)


      
(f32.store
  
(i32.add
  (i32.const 468 (; TimbreWork.filter.current_frequency ;))
  (local.get $timbre_work)
)

  (f32.mul
          
(f32.load
  
(i32.add
  (i32.const 4 (; Filter.base_frequency ;))
  (local.get $filter)
)

)

          (local.get $filter_value)
        )
      
)


      (call_indirect (type $filterFunc)
        
(i32.add
  (i32.const 436 (; TimbreWork.filter ;))
  (local.get $timbre_work)
)

        (i32.add
          (i32.load
            (i32.add
              (i32.const 0 (; Filter.filter_type ;))
              (i32.load
                (i32.add
                  (i32.const 436 (; TimbreWork.filter ;))
                  (local.get $timbre_work)
                )
              )
            )
          )
          (i32.const (; $.FILTER_FUNC_INDEX ;)8)
        )
      )
    )
  )

  ;; オシレータ&音量処理
  ;; out = oscillator_output * lfo * envelope * output_level
  (f32.store 
    (i32.add
      (i32.const 644 (; TimbreWork.value ;))
      (local.get $timbre_work)
    )
    (f32.mul 
      (f32.mul
        ;; フィルタ
        (if (result f32)
          (i32.and
            (local.get $timbre_flag)
            (i32.const 16)
          )
          (then
            (call $processFilter
              (i32.add 
                (i32.const 436 (; TimbreWork.filter ;))
                (local.get $timbre_work)
              )
              ;; オシレータ
              (call_indirect (type $oscillatorFunc)
                (local.get $oscillator_work_offset)
                (i32.load
                  (i32.add
                    (i32.const 4 (; Oscillator.call_index ;))
                    (local.get $oscillator_offset)
                  )
                )
              )
            )
          )
          (else 
            ;; オシレータ
            (call_indirect (type $oscillatorFunc)
              (local.get $oscillator_work_offset)
              (i32.load
                (i32.add
                  (i32.const 4 (; Oscillator.call_index ;))
                  (local.get $oscillator_offset)
                )
              )
            )
          )
        )
        ;; amplitude envelope
        (if (result f32)
          (i32.and
            (local.get $timbre_flag)
            (i32.const 0x4)
          )
          (then
            (call $doEnvelope
              (i32.add
                (i32.const 288 (; TimbreWork.amplitude_envelope ;))
                (local.get $timbre_work)
              )
            )
          )
          (else
            (f32.const 1)
          )
        )
      )
      ;; output level
      
(if (result f32)
  (f32.lt
    (if (result f32)
      (f32.gt 
        (local.tee $temp
          (f32.add 
          ;; amplitude lfo
          (if (result f32)
            (i32.and
              (local.get $timbre_flag)
              (i32.const 0x8)
            )
            (then
              (call_indirect (type $oscillatorFunc) 
                (local.tee $amplitude_lfo_work_offset
                  (i32.add
                    (i32.const 308 (; TimbreWork.amplitude_lfo_work_offset ;))
                    (local.get $timbre_work)
                  )
                )
                (i32.load
                  (i32.add
                    (i32.const 4 (; Oscillator.call_index ;))
                    
(i32.load
  
(i32.add
  (i32.const 0 (; OscillatorWork.param_offset ;))
  (local.get $amplitude_lfo_work_offset)
)

)

                  )
                )
              )
            )
            (else 
              (f32.const +0.0)
            )
          )
          
(f32.load
  
(i32.add
  (i32.const 640 (; TimbreWork.output_level ;))
  (local.get $timbre_work)
)

)

        )
        )
        (f32.const +1.0
      )
      )
      (then
        (f32.const +1.0
      )
      )
      (else 
        (local.get $temp)
      )
    )
    (f32.const +0.0)
  )
  (then
    (f32.const +0.0)
  )
  (else
    (local.get $temp)
  )
)

    )
  )
  ;; output 
  
(f32.load
  
(i32.add
  (i32.const 644 (; TimbreWork.value ;))
  (local.get $timbre_work)
)

)

)

;; --------------------------------
;; test用 Timbreのセットアップ
;; --------------------------------

(func $initTestTimbre
  (result i32)
  (local $loop_counter i32)
  (local $offset_src i32)
  (local $offset_dest i32)
  (local $offset_dest1 i32)
  (local $oscillator_offset i32)
  (local $oscillator1_offset i32)
  (local $timbre_offset i32)
  
  ;; オシレータ0のセットアップ
  ;; 512サンプル分取る
  (i32.store
    (i32.const 12 (; oscillator ;))
    (local.tee $oscillator_offset
      (call $allocateWaveTable
        (i32.const 512)
      )
    )
  )
  ;; オシレータ1のセットアップ
  ;; 32サンプル分取る
  (i32.store
    (i32.const 16 (; oscillator ;))
    (local.tee $oscillator1_offset
      (call $allocateWaveTable
        (i32.const 32)
      )
    )
  )

  ;; sizeを32サンプルにセット
  


(i32.store
  
(i32.add
  (i32.const 8 (; WaveTable.size ;))
  (local.get $oscillator_offset)
)

  (i32.const +32)
  
)



(i64.store
  
(i32.add
  (i32.const 12 (; WaveTable.wave_size_mask ;))
  (local.get $oscillator_offset)
)

  (i64.sub
    (i64.shl
      (i64.extend_i32_u (i32.const +32)
  )
      (i64.const (; $.FIXED_POINT ;)16)
    )
    (i64.const +1)
  )

)


  
  


(i32.store
  
(i32.add
  (i32.const 8 (; WaveTable.size ;))
  (local.get $oscillator1_offset)
)

  (i32.const +32)
  
)



(i64.store
  
(i32.add
  (i32.const 12 (; WaveTable.wave_size_mask ;))
  (local.get $oscillator1_offset)
)

  (i64.sub
    (i64.shl
      (i64.extend_i32_u (i32.const +32)
  )
      (i64.const (; $.FIXED_POINT ;)16)
    )
    (i64.const +1)
  )

)



  ;; sinデータのコピー
  (block $sin_data_copy
    (local.set $loop_counter (i32.const 32))
    (local.set $offset_src (i32.const 15072 (; sin_table ;))) 
    (local.set $offset_dest 
      (i32.add
        (i32.const 20 (; WaveTable.wave_data_start ;))
        (i32.load (i32.const 12 (; oscillator ;)) )
      )
    )
    (local.set $offset_dest1 
      (i32.add
        (i32.const 20 (; WaveTable.wave_data_start ;))
        (i32.load (i32.const 16 (; oscillator ;)) )
      )
    )

    (loop $sin_loop
      (br_if $sin_data_copy
        (i32.eqz
          (local.tee $loop_counter
            (i32.sub
              (local.get $loop_counter)
              (i32.const 1)
            )
          )
        )
      )

      (f32.store
        (local.get $offset_dest)
        (f32.load (local.get $offset_src))
      )

      (f32.store
        (local.get $offset_dest1)
        (f32.load (local.get $offset_src))
      )

      (local.set $offset_dest
        (i32.add
          (local.get $offset_dest)
          (i32.const 4)
        )
      )

      (local.set $offset_dest1
        (i32.add
          (local.get $offset_dest1)
          (i32.const 4)
        )
      )

      (local.set $offset_src
        (i32.add
          (local.get $offset_src)
          (i32.const 4)
        )
      )
      (br $sin_loop)
    )
  )

  ;; timbre 0 のセットアップ

  ;; フラグ
  (i32.store
    (i32.const 140 (; timbre.flag ;))
    (i32.const 0x0)
  )

  ;; オシレータ
  (i32.store 
    (i32.const 144 (; timbre.oscillator_offset ;))
    (local.get $oscillator_offset)
  )

  (f32.store
    (i32.const 148 (; timbre.oscillator_base_frequency ;))
    (f32.const 440) ;; 440Hz
  )


  ;; ピッチ・エンベロープ
  (call $initEnvelope
    (i32.const 152 (; timbre.pitch_envelope ;))
    (f32.load (i32.const 4 (; sample_rate ;)))
    (f32.const 0.00015) ;; a
    (f32.const 0.15) ;; d
    (f32.const 0.2) ;; s
    (f32.const 0.2) ;; r
    (f32.const 1.0) ;; level
  )

  ;; Pitch LFO
  (i32.store
    (i32.const 184 (; timbre.pitch_lfo_offset ;))
    (local.get $oscillator1_offset)
  )

  (f32.store
    (i32.const 188 (; timbre.pitch_lfo_base_frequency ;))
    (f32.const 20) ;; 20Hz
  )

  ;; 音量・エンベロープ
  
  (call $initEnvelope
    (i32.const 192 (; timbre.amplitude_envelope ;))
    (f32.load (i32.const 4 (; sample_rate ;)))
    (f32.const 0.001)
    (f32.const 0.5)
    (f32.const 0.5)
    (f32.const 0.25)
    (f32.const 1.0)
  )
  
  ;; 音量LFO・オフセット
  (i32.store
    (i32.const 224 (; timbre.amplitude_lfo_offset ;))
    (local.get $oscillator1_offset)
  )

  (f32.store
    (i32.const 228 (; timbre.amplitude_lfo_base_frequency ;))
    (f32.const 20) ;; 20Hz
  )

  ;; フィルタ
      
  (call $initFilter
    (i32.const 232 (; timbre.filter ;))
    (i32.const 0)
    (f32.const 4000)
    (f32.const 1.0)
    (f32.const 0.5)
    (f32.const 1.0)
  )

  (call $initFilterWork
    (i32.const 232 (; timbre.filter ;))
    (i32.const 10304 (; timbre_work.filter ;))
  )

  (call $initEnvelope
    (i32.const 252 (; timbre.filter_envelope ;))
    (f32.load (i32.const 4 (; sample_rate ;)))
    (f32.const 0.0)
    (f32.const 2.0)
    (f32.const 0.5)
    (f32.const 2.0)
    (f32.const 1.0)
  )

  ;; フィルタLFO・オフセット
  (i32.store
    (i32.const 284 (; timbre.filter_lfo_offset ;))
    (local.get $oscillator_offset)
  )
  
  (f32.store
    (i32.const 288 (; timbre.filter_lfo_base_frequency ;))
    (f32.const 20) ;; 20Hz
  )

  ;; Timbre ワークのセットアップ 
  
  ;; フラグ
  (i32.store
    (i32.const 9868 (; timbre_work.flag ;))
    (i32.const 0x80000000)
  )

  ;; Timbreオフセット
  (i32.store
    (i32.const 9872 (; timbre_work.timbre_offset ;))
    (i32.const 140 (; timbre ;))
  )

  ;; pitch
  (f32.store
    (i32.const 9876 (; timbre_work.pitch ;))
    (f32.const 1)
  )

  ;; oscillator ワーク の初期化
  (call $initWaveTableWork
    (i32.const 9880 (; timbre_work.oscillator_work_offset ;))
    (local.get $oscillator_offset)
    (f32.load 
      (i32.const 148 (; timbre.oscillator_base_frequency ;))
    )
  )

  ;; pitch lfo ワーク の初期化
  (call $initWaveTableWork
    (i32.const 10028 (; timbre_work.pitch_lfo_work_offset ;))
    (local.get $oscillator_offset)
    (f32.load 
      (i32.const 188 (; timbre.pitch_lfo_base_frequency ;))
    )
  )

  ;; amplitude lfo ワークの初期化
  (call $initWaveTableWork
    (i32.const 10176 (; timbre_work.amplitude_lfo_work_offset ;))
    (local.get $oscillator_offset)
    (f32.load 
      (i32.const 228 (; timbre.amplitude_lfo_base_frequency ;))
    )
  )

  ;; filter lfo ワークの初期化
  (call $initWaveTableWork
    (i32.const 10380 (; timbre_work.filter_lfo_work_offset ;))
    (local.get $oscillator_offset)
    (f32.load 
      (i32.const 288 (; timbre.filter_lfo_base_frequency ;))
    )
  )

  ;; pitch envelope ワークの初期化
  (call $initEnvelopeWork
    (i32.const 10008 (; timbre_work.pitch_envelope ;))
    (i32.const 152 (; timbre.pitch_envelope ;))
  )

  ;; amplitude envelope ワークの初期化
  (call $initEnvelopeWork
    (i32.const 10156 (; timbre_work.amplitude_envelope ;))
    (i32.const 192 (; timbre.amplitude_envelope ;))
  )
  
  ;; filter envelope ワークの初期化
  (call $initEnvelopeWork
    (i32.const 10360 (; timbre_work.filter_envelope ;))
    (i32.const 252 (; timbre.filter_envelope ;))
  )

  ;; output level
  (f32.store
    (i32.const 10508 (; timbre_work.output_level ;))
    (f32.const 1)
  )

  (i32.const 9868 (; timbre_work ;))

)

;; ==================================
;; Filter 
;; 以下サイトのC++コードを参考に実装
;; http://vstcpp.wpblog.jp/?page_id=728
;; ==================================

;; -----------------------
;; low pass filter
;; -----------------------

(func $lowPassFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f32)
  (local $cos_omega f32)
  (local $alpha f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )
  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;

  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (f64.promote_f32 
          (local.tee $omega
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )
  ;; float alpha = sin(omega) / (2.0f * q);
  (local.set $alpha
    (f32.div
      (f32.demote_f64 
        (call $sin (f64.promote_f32 (local.get $omega)))
      )
      (f32.mul
        (f32.const 2.0)
        (f32.load
          (i32.add
            (i32.const 8 (; Filter.q ;))
            (local.get $filter)
          )
        )
      )
    ) 
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha;
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;; a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )
  ;; a2 = 1.0f - alpha;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;; b0 = (1.0f - cos(omega)) / 2.0f;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.sub
        (f32.const 1.0)
        (local.get $cos_omega)
      )
      (f32.const 0.5)
    )
  )
  
  ;; b1 = 1.0f - cos(omega);
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
  )
  (f32.sub
      (f32.const 1.0)
      (local.get $cos_omega)
    )
  )
  ;; b2 = (1.0f - cos(omega)) / 2.0f;  )
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.load
      (i32.add
        (i32.const 16 (; FilterWork.b0 ;))
        (local.get $filter_work)
      )
    )
  )
)

;; -----------------------
;; high pass filter
;; -----------------------

(func $highPassFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f32)
  (local $cos_omega f32)
  (local $alpha f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )
  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;

  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (f64.promote_f32 
          (local.tee $omega
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )
  ;; float alpha = sin(omega) / (2.0f * q);
  (local.set $alpha
    (f32.div
      (f32.demote_f64 
        (call $sin (f64.promote_f32 (local.get $omega)))
      )
      (f32.mul
        (f32.const 2.0)
        (f32.load
          (i32.add
            (i32.const 8 (; Filter.q ;))
            (local.get $filter)
          )
        )
      )
    ) 
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha;
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;; a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )
  ;; a2 = 1.0f - alpha;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;; b0 = (1.0f - cos(omega)) / 2.0f;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.sub
        (f32.const 1.0)
        (local.get $cos_omega)
      )
      (f32.const 0.5)
    )
  )
  
  ;; b1 = -1.0f + cos(omega);
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
  )
  (f32.add
      (f32.const -1.0)
      (local.get $cos_omega)
    )
  )
  ;; b2 = (1.0f - cos(omega)) / 2.0f;  )
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.load
      (i32.add
        (i32.const 16 (; FilterWork.b0 ;))
        (local.get $filter_work)
      )
    )
  )
)

;; -----------------------
;; Notch Filter
;; -----------------------

(func $notchFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f64)
  (local $alpha f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  ;; float omega = 2.0f * 3.14159265f *  freq / samplerate;
  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;; float alpha = sin(omega) * sinh(log(2.0f) / 2.0 * bw * omega / sin(omega));
  (local.set $sin_omega
    (call $sin (local.get $omega))
  )
  (local.set $alpha
    (f32.demote_f64 
      (f64.mul
        (local.get $sin_omega)
        (call $sinh
          (f64.div
            (f64.mul
              (f64.mul
                (f64.const (; Math.log(2.0) / 2.0 ; ;)0.34657359027997264)
                (f64.promote_f32
                  (f32.load
                    (i32.add
                      (i32.const 12 (; Filter.band_width ;))
                      (local.get $filter_work)
                    )
                  )
                )
              )
              (local.get $omega)
            )
            (local.get $sin_omega)
          )
        )
      )
    )
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha;    
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;;a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )
  ;; a2 = 1.0 - alpha;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1.0)
      (local.get $alpha)
    )
  )

  ;; b0 = 1.0f;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.const 1)
  )
  
  ;; b1 = -2.0f * cos(omega);
  (f32.store 
      (i32.add
        (i32.const 20 (; FilterWork.b1 ;))
        (local.get $filter_work)
      )
      (f32.mul
        (f32.const -2.0)
        (local.get $cos_omega)
      )
  )

  ;; b2 = 1.0f;
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.const 1)
  )
)

;; -----------------------
;; Band Pass Filter
;; -----------------------

(func $bandPassFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f64)
  (local $alpha f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )
  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;

  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;;float alpha = sin(omega) * sinh(log(2.0f) / 2.0 * bw * omega / sin(omega));
  (local.set $sin_omega
    (call $sin (local.get $omega))
  )
  (local.set $alpha
    (f32.demote_f64 
      (f64.mul
        (local.get $sin_omega)
        (call $sinh
          (f64.div
            (f64.mul
              (f64.mul
                (f64.const (; Math.log(2.0) / 2.0 ; ;)0.34657359027997264)
                (f64.promote_f32
                  (f32.load
                    (i32.add
                      (i32.const 12 (; Filter.band_width ;))
                      (local.get $filter_work)
                    )
                  )
                )
              )
              (local.get $omega)
            )
            (local.get $sin_omega)
          )
        )

      )
    )
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha;
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  ;;a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )
  ;; a2 = 1.0 - alpha;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1.0)
      (local.get $alpha)
    )
  )

  ;;b0 = alpha;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (local.get $alpha)
  )
  
  ;;b1 = 0.0f;
  (f32.store 
      (i32.add
        (i32.const 20 (; FilterWork.b1 ;))
        (local.get $filter_work)
      )
      (f32.const 0)
  )

  ;;b2 = -alpha;
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (local.get $alpha)
  )
)

;; -----------------------
;; Low Shelf Filter
;; -----------------------

(func $lowShelfFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f32)
  (local $alpha f32)
  (local $A f32)
  (local $beta f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;
  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;; float alpha = sin(omega) / (2.0f * q);
  (local.set $sin_omega
    (f32.demote_f64
      (call $sin (local.get $omega))
    )
  )
  (local.set $alpha
    (f32.div
      (local.get $sin_omega)
      (f32.mul
        (f32.const 2)
        (f32.load
          (i32.add
            (i32.const 8 (; Filter.q ;))
            (local.get $filter)
          )
        )
      )
    )
  )
  ;; float A = pow(10.0f, (gain / 40.0f));
  (local.set $A
    (f32.demote_f64
      (call $pow
        (f64.const 10.0)
        (f64.mul 
          (f64.promote_f32
            (f32.load
              (i32.add
                (i32.const 16 (; Filter.gain ;))
                (local.get $filter)
              )
            )
          )
          (f64.const (; 1 / 40.0  ;)0.025)
        )
      )
    )
  )

  ;; float beta = sqrt(A) / q;
  (local.set $beta
    (f32.demote_f64
      (f64.div
        (f64.sqrt
          (f64.promote_f32
            (local.get $A)
          )        
        )
        (f64.promote_f32
          (f32.load
            (i32.add
              (i32.const 8 (; Filter.q ;))
              (local.get $filter)
            )
          )
        )
      )
    )
  )


  ;; フィルタ係数を求める。
  ;; a0 = (A + 1.0f) + (A - 1.0f) * cos(omega) + beta * sin(omega);
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.add
        (local.get $A)
        (f32.const 1)
      )
      (f32.add
        (f32.mul
          (f32.sub
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
        (f32.mul
          (local.get $beta)
          (local.get $sin_omega)
        )
      )
    )
  )

  ;; a1 = -2.0f * ((A - 1.0f) + (A + 1.0f) * cos(omega));
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (f32.add
        (f32.sub
          (local.get $A)
          (f32.const 1)
        )
        (f32.mul
          (f32.add
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
      )
    )
  )

  ;; a2 = (A + 1.0f) + (A - 1.0f) * cos(omega) - beta * sin(omega);
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.add
        (local.get $A)
        (f32.const 1)
      )
      (f32.sub
        (f32.mul
          (f32.sub
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
        (f32.mul
          (local.get $beta)
          (local.get $sin_omega)
        )
      )
    )
  )

  ;; b0 = A * ((A + 1.0f) - (A - 1.0f) * cos(omega) + beta * sin(omega));
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (local.get $A)
      (f32.sub
        (f32.add
          (local.get $A)
          (f32.const 1)
        )
        (f32.add
          (f32.mul
            (f32.sub
              (local.get $A)
              (f32.const 1)
            )
            (local.get $cos_omega)
          )
          (f32.mul
            (local.get $beta)
            (local.get $sin_omega)
          )
        )
      )
    )
  )
  
  ;; b1 = 2.0f * A * ((A - 1.0f) - (A + 1.0f) * cos(omega));
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.mul
        (f32.const 2.0)
        (local.get $A)
      )
      (f32.sub
        (f32.sub
          (local.get $A)
          (f32.const 1)
        )
        (f32.mul
          (f32.add
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
      )
    )        
  )

  ;; b2 = A * ((A + 1.0f) - (A - 1.0f) * cos(omega) - beta * sin(omega));
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (local.get $A)
      (f32.sub
        (f32.add
          (local.get $A)
          (f32.const 1)
        )
        (f32.sub
          (f32.mul
            (f32.sub
              (local.get $A)
              (f32.const 1)
            )
            (local.get $cos_omega)
          )
          (f32.mul
            (local.get $beta)
            (local.get $sin_omega)
          )
        )
      )
    )
  )
)


;; -----------------------
;; High Shelf Filter
;; -----------------------

(func $HighShelfFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f32)
  (local $alpha f32)
  (local $A f32)
  (local $beta f32)
  ;;
  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;
  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;; float alpha = sin(omega) / (2.0f * q);
  (local.set $sin_omega
    (f32.demote_f64
      (call $sin (local.get $omega))
    )
  )
  (local.set $alpha
    (f32.div
      (local.get $sin_omega)
      (f32.mul
        (f32.const 2)
        (f32.load
          (i32.add
            (i32.const 8 (; Filter.q ;))
            (local.get $filter)
          )
        )
      )
    )
  )

  ;; float A = pow(10.0f, (gain / 40.0f));
  (local.set $A
    (f32.demote_f64
      (call $pow
        (f64.const 10.0)
        (f64.mul 
          (f64.promote_f32
            (f32.load
              (i32.add
                (i32.const 16 (; Filter.gain ;))
                (local.get $filter)
              )
            )
          )
          (f64.const (; 1 / 40.0  ;)0.025)
        )
      )
    )
  )

  ;; float beta = sqrt(A) / q;
  (local.set $beta
    (f32.demote_f64
      (f64.div
        (f64.sqrt
          (f64.promote_f32
            (local.get $A)
          )        
        )
        (f64.promote_f32
          (f32.load
            (i32.add
              (i32.const 8 (; Filter.q ;))
              (local.get $filter)
            )
          )
        )
      )
    )
  )


  ;; フィルタ係数を求める。
  ;; a0 = (A + 1.0f) - (A - 1.0f) * cos(omega) + beta * sin(omega);
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.sub
        (f32.add
          (local.get $A)
          (f32.const 1)
        )
        (f32.mul
          (f32.sub
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
      )
      (f32.mul
        (local.get $beta)
        (local.get $sin_omega)
      )
    )
  )

  ;; a1 = 2.0f * ((A - 1.0f) - (A + 1.0f) * cos(omega));
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const 2.0)
      (f32.sub
        (f32.sub
          (local.get $A)
          (f32.const 1)
        )
        (f32.mul
          (f32.add
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
      )
    )
  )

  ;; a2 = (A + 1.0f) - (A - 1.0f) * cos(omega) - beta * sin(omega);
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.add
        (local.get $A)
        (f32.const 1)
      )
      (f32.sub
        (f32.mul
          (f32.sub
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
        (f32.mul
          (local.get $beta)
          (local.get $sin_omega)
        )
      )
    )
  )

  ;; b0 = A * ((A + 1.0f) + (A - 1.0f) * cos(omega) + beta * sin(omega));
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (local.get $A)
      (f32.add
        (f32.add
          (local.get $A)
          (f32.const 1)
        )
        (f32.add
          (f32.mul
            (f32.sub
              (local.get $A)
              (f32.const 1)
            )
            (local.get $cos_omega)
          )
          (f32.mul
            (local.get $beta)
            (local.get $sin_omega)
          )
        )
      )
    )
  )
  
  ;; b1 = -2.0f * A * ((A - 1.0f) + (A + 1.0f) * cos(omega));
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.mul
        (f32.const -2.0)
        (local.get $A)
      )
      (f32.add
        (f32.sub
          (local.get $A)
          (f32.const 1)
        )
        (f32.mul
          (f32.add
            (local.get $A)
            (f32.const 1)
          )
          (local.get $cos_omega)
        )
      )
    )        
  )

  ;; b2 = A * ((A + 1.0f) + (A - 1.0f) * cos(omega) - beta * sin(omega));
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (local.get $A)
      (f32.add
        (f32.add
          (local.get $A)
          (f32.const 1)
        )
        (f32.sub
          (f32.mul
            (f32.sub
              (local.get $A)
              (f32.const 1)
            )
            (local.get $cos_omega)
          )
          (f32.mul
            (local.get $beta)
            (local.get $sin_omega)
          )
        )
      )
    )
  )
) 

;; -----------------------
;; Peaking Filter
;; -----------------------

(func $PeakingFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f32)
  (local $sin_omega_f64 f64)
  (local $alpha f32)
  (local $A f32)


  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;
  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;; float alpha = sin(omega) * sinh(log(2.0f) / 2.0 * bw * omega / sin(omega));
  (local.set $sin_omega
    (f32.demote_f64
      (local.tee $sin_omega_f64
        (call $sin (local.get $omega))
      )
    )
  )

  (local.set $alpha
    (f32.demote_f64
      (f64.mul
        (local.get $sin_omega_f64)
        (call $sinh 
          (f64.div
            (f64.mul 
              (f64.mul 
                (f64.const (; Math.log(2.0) / 2.0;  ;)0.34657359027997264)
                (f64.promote_f32
                  (f32.load 
                    (i32.add (i32.const 12 (; Filter.band_width ;)) (local.get $filter))
                  )
                )
              )
              (local.get $omega)
            )
            (local.get $sin_omega_f64)
          )
        )
      )
    )
  )

  ;; float A = pow(10.0f, (gain / 40.0f));
  (local.set $A
    (f32.demote_f64
      (call $pow
        (f64.const 10.0)
        (f64.mul 
          (f64.promote_f32
            (f32.load
              (i32.add
                (i32.const 16 (; Filter.gain ;))
                (local.get $filter)
              )
            )
          )
          (f64.const (; 1 / 40.0  ;)0.025)
        )
      )
    )
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha / A;
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1)
      (f32.div
        (local.get $alpha)
        (local.get $A)
      )
    )
  )

  ;; a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )

  ;; a2 = 1.0f - alpha / A;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1)
      (f32.div
        (local.get $alpha)
        (local.get $A)
      )
    )
  )

  ;; b0 = 1.0f + alpha * A;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1.0)
      (f32.mul
        (local.get $alpha)
        (local.get $A)
      )
    )
  )
  
  ;; b1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )

  ;; b2 = 1.0f - alpha * A;
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1)
      (f32.mul
        (local.get $alpha)
        (local.get $A)
      )
    )
  )
) 

;; -----------------------
;; AllPass Filter
;; -----------------------

(func $allPassFilter
  (param $filter_work i32)
  (local $filter i32)
  (local $omega f64)
  (local $cos_omega f32)
  (local $sin_omega f32)
  (local $sin_omega_f64 f64)
  (local $alpha f32)
  (local $A f32)


  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  ;; omega = 2.0f * 3.14159265f *  freq / samplerate;
  (local.set $cos_omega
    (f32.demote_f64 
      (call $cos 
        (local.tee $omega
          (f64.promote_f32 
            (f32.mul
              (f32.mul
                (f32.const (; Math.PI * 2;  ;)6.283185307179586)
                (f32.load
                  (i32.add
                    (i32.const 32 (; FilterWork.current_frequency ;))
                    (local.get $filter_work)
                  )
                )
              )
              (f32.load (i32.const 8 (; delta ;)))
            )
          )
        )
      )
    )
  )

  ;; float alpha = sin(omega) / (2.0f * q);
  (local.set $alpha
    (f32.demote_f64
      (f64.div
        (call $sin (local.get $omega))
        (f64.mul
          (f64.const 2.0)
          (f64.load
            (i32.add
              (i32.const 8 (; Filter.q ;))
              (local.get $filter)
            )
          )
        )
      )
    )
  )

  ;; フィルタ係数を求める。
  ;; a0 = 1.0f + alpha;
  (f32.store 
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1)
      (local.get $alpha)
    )
  )

  ;; a1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )

  ;; a2 = 1.0f - alpha;
  (f32.store 
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1)
      (local.get $alpha)
    )
  )

  ;; b0 = 1.0f - alpha;
  (f32.store 
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.sub
      (f32.const 1.0)
      (local.get $alpha)
    )
  )
  
  ;; b1 = -2.0f * cos(omega);
  (f32.store 
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
    )
    (f32.mul
      (f32.const -2.0)
      (local.get $cos_omega)
    )
  )

  ;; b2 = 1.0f + alpha;
  (f32.store 
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.add
      (f32.const 1)
      (local.get $alpha)
    ) 
  )
) 

;; -----------------------
;; filterの実行
;; -----------------------

  (func $processFilter 
  (param $filter_work i32)
  (param $in f32)
  (result f32)
  (local $filter i32)

  (local $a0 f32)
  (local $a1 f32)
  (local $a2 f32)
  (local $b0 f32)
  (local $b1 f32)
  (local $b2 f32)
  (local $out f32)
  (local $out1 f32)
  (local $out2 f32)
  (local $in1 f32)
  (local $in2 f32)

  (local.set $filter
    (i32.load
      (local.get $filter_work)
    )
  )

  (local.set $a0
    (f32.load
      (i32.add 
        (i32.const 4 (; FilterWork.a0 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $a1
    (f32.load
      (i32.add 
        (i32.const 8 (; FilterWork.a1 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $a2
    (f32.load
      (i32.add 
        (i32.const 12 (; FilterWork.a2 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $b0
    (f32.load
      (i32.add 
        (i32.const 16 (; FilterWork.b0 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $b1
    (f32.load
      (i32.add 
        (i32.const 20 (; FilterWork.b1 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $b2
    (f32.load
      (i32.add 
        (i32.const 24 (; FilterWork.b2 ;))
        (local.get $filter_work)
      )
    )
  )

  (local.set $out1
    (f32.load
      (i32.add 
        (i32.const 44 (; FilterWork.out1 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $out2
    (f32.load
      (i32.add 
        (i32.const 48 (; FilterWork.out2 ;))
        (local.get $filter_work)
      )
    )
  )
  (local.set $in1
    (f32.load
      (i32.add 
        (i32.const 36 (; FilterWork.in1 ;))
        (local.get $filter_work)
      )
    )
  )

  (local.set $in2
    (f32.load
      (i32.add 
        (i32.const 40 (; FilterWork.in2 ;))
        (local.get $filter_work)
      )
    )
  )
  ;; // 入力信号にフィルタを適用し、出力信号変数に保存。
  ;; float out = b0 / a0 * in + b1 / a0 * in1 + b2 / a0 * in2
  ;; 	- a1 / a0 * out1 - a2 / a0 * out2;
  (local.set $out
    (f32.sub
      (f32.sub
        (f32.add
          (f32.mul 
            (f32.div
              (local.get $b0)
              (local.get $a0)
            )
            (local.get $in)
          )
          (f32.add
            (f32.mul
              (f32.div
                (local.get $b1)
                (local.get $a0)
              )
              (local.get $in1)
            )
            (f32.mul
              (f32.div
                (local.get $b2)
                (local.get $a0)
              )
              (local.get $in2)
            )
          )
        )
        (f32.mul
          (f32.div
            (local.get $a1)
            (local.get $a0)
          )
          (local.get $out1)
        )      
      )
      (f32.mul
        (f32.div
          (local.get $a2)
          (local.get $a0)
        )
        (local.get $out2)
      )
    )
  )
  ;; out2 = out1; // 2つ前の出力信号を更新
  (f32.store
    (i32.add
      (i32.const 48 (; FilterWork.out2 ;))
      (local.get $filter_work)
    )
    (local.get $out1)
  )

  ;; out1 = out;  // 1つ前の出力信号を更新
  (f32.store
    (i32.add
      (i32.const 44 (; FilterWork.out1 ;))
      (local.get $filter_work)
    )
    (local.get $out)
  )

  ;; in2 = in1; // 2つ前の入力信号を更新
  (f32.store
    (i32.add
      (i32.const 40 (; FilterWork.in2 ;))
      (local.get $filter_work)
    )
    (local.get $in1)
  )
  ;; in1 = in;  // 1つ前の入力信号を更新
  (f32.store
    (i32.add
      (i32.const 36 (; FilterWork.in1 ;))
      (local.get $filter_work)
    )
    (local.get $in)
  )
  ;; // 出力信号を返す
  (local.get $out)
)

(func $initFilter
  (param $filter i32)
  (param $filter_type i32)
  (param $base_frequency f32)
  (param $q f32)
  (param $band_width f32)
  (param $gain f32)

  (i32.store
    (i32.add
      (i32.const 0 (; Filter.filter_type ;))
      (local.get $filter)
    )
    (local.get $filter_type)
  )

  (f32.store
    (i32.add
      (i32.const 4 (; Filter.base_frequency ;))
      (local.get $filter)
    )
    (local.get $base_frequency)
  )

  (f32.store
    (i32.add
      (i32.const 8 (; Filter.q ;))
      (local.get $filter)
    )
    (local.get $q)
  )

  (f32.store
    (i32.add
      (i32.const 12 (; Filter.band_width ;))
      (local.get $filter)
    )
    (local.get $band_width)
  )

  (f32.store
    (i32.add
      (i32.const 16 (; Filter.gain ;))
      (local.get $filter)
    )
    (local.get $gain)
  ) 
)

(func $initFilterWork
  (param $filter i32)
  (param $filter_work i32)

  (i32.store
    (local.get $filter_work)
    (local.get $filter)
  )

  (f32.store
    (i32.add
      (i32.const 4 (; FilterWork.a0 ;))
      (local.get $filter_work)
    )
    (f32.const 1)
  )

  (f32.store
    (i32.add
      (i32.const 8 (; FilterWork.a1 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 12 (; FilterWork.a2 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )
  
  (f32.store
    (i32.add
      (i32.const 16 (; FilterWork.b0 ;))
      (local.get $filter_work)
    )
    (f32.const 1)
  )

  (f32.store
    (i32.add
      (i32.const 20 (; FilterWork.b1 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 24 (; FilterWork.b2 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 28 (; FilterWork.freq_rate ;))
      (local.get $filter_work)
    )
    (f32.const 1)
  )

  (f32.store
    (i32.add
      (i32.const 32 (; FilterWork.current_frequency ;))
      (local.get $filter_work)
    )
    (f32.load
      (i32.add
        (i32.const 4 (; Filter.base_frequency ;))
        (local.get $filter)
      )
    )
  )

  (f32.store
    (i32.add
      (i32.const 36 (; FilterWork.in1 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 40 (; FilterWork.in2 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 44 (; FilterWork.out1 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )

  (f32.store
    (i32.add
      (i32.const 48 (; FilterWork.out2 ;))
      (local.get $filter_work)
    )
    (f32.const 0)
  )
)

;; --------------------------- 
;; output buffer
;; --------------------------- 

(func $initOutputBuffer 
  (param $size i32)
  (result i32)
  (local $offset i32)
  (i32.store 
    (i32.const 15052 (; output_buffer_offset ;))
    (local.tee $offset
      (call $allocateMemory
        (local.get $size)
      )
    )
  )
  
  (i32.store
    (i32.const 15056 (; output_buffer_size ;))
    (local.get $size)
  )

  (i32.store
    (i32.const 15060 (; output_buffer_mask ;))
    (i32.sub
      (local.get $size)
      (i32.const 1)
    )
  )
  (call $resetBuffer)
  (local.get $offset)
)

(func $resetBuffer
  (i32.store
    (i32.const 15064 (; read_offset ;))
    (i32.const 0)
  )

  (i32.store
    (i32.const 15068 (; write_offset ;))
    (i32.const 0)
  )

)

;; process
(func $process
    (;; local変数 ;;)
  (local $woffset i32) 
  (local $roffset i32)
  (local $buffer_mask i32)
  (local $buffer_start i32)
;;    (if (i32.eq (i32.load (&read_offset;)) (i32.load (&write_offset;)))
;;      (then
;;        (return) 
;;      ) 
;;    )

    (local.set $woffset 
      (i32.load (i32.const 15068 (; write_offset ;)))
    )
    (local.set $roffset 
      (i32.load (i32.const 15064 (; read_offset ;)))
    )

    (local.set $buffer_mask
      (i32.load (i32.const 15060 (; output_buffer_mask ;)))
    )

    (local.set $buffer_start
      (i32.load (i32.const 15052 (; output_buffer_offset ;))) 
    )

    (block $render_exit
      (loop $render_loop
        (br_if $render_exit (i32.eq (local.get $roffset) (local.get $woffset)))
        (f32.store 
          (i32.add 
            (local.get $buffer_start) 
            (local.get $woffset)
          )
          (call $processTimbre
            (i32.const 9868 (; timbre_work ;))
          )
        )
        (local.set $woffset 
          (i32.and
            (i32.add (local.get $woffset) (i32.const 4))
            (local.get $buffer_mask)
          )
        )
        (br $render_loop)
      )
    )

    (i32.atomic.store (i32.const 15068 (; write_offset ;)) (local.get $woffset))

  )
  ;; fill
  (func $fill 
    (local $end i32) 
    (local $woffset i32) 
    (local $output f32)

    (local.set $woffset (i32.load (i32.const 15052 (; output_buffer_offset ;))))

    (local.set $end
      (i32.add (local.get $woffset) (i32.load (i32.const 15056 (; output_buffer_size ;))))
    )
 
    (block $fill_exit
      (loop $fill_loop
        (br_if $fill_exit (i32.gt_s (local.get $woffset) (local.get $end)))

        (f32.store (local.get $woffset)
          (call $processTimbre
            (i32.const 9868 (; timbre_work ;))
          )
        )
        (local.set $woffset (i32.add (local.get $woffset) (i32.const 4)))
        (br $fill_loop)
      )
    )
  )
)

