
export const seqData = {
  name: 'Test',
  tracks: [
/*    {
      name: 'part1',
      channel: 0,
      mml:
      `
       s0.01,0.2,0.2,0.03 @2 
       t140  q35 v30 l1r1r1r1r1 $l16o3 cccccccc<ggggaabb> cccccccc<gggg>cc<bb b-b-b-b-b-b-b-b-ffffggg+g+ g+g+g+g+g+g+g+g+ggggaabb >
             `
      },*/
    {
      name: 'part1',
      channel: 1,
      mml:
      `
      s0.01,0.01,0.8,0.05 @6 
      t160  q80 v40 o3 l16 
      erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr $ 
      /:erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr:/4   
      /:erer rrgr rrgr rrar r1 erer rrgr rrgr rrdr r1:/2     
     `      
      // `
      //  s0.01,0.01,0.8,0.05 @6 
      //  t160  q80 v40 o3 l16 $ /:erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr:/4 
      // `
       },
    {
      name: 'part1',
      channel: 2,
      mml:
      `
       s0.01,0.2,0.2,0.1 @2
       t160 q95 v10 o4 l1 
       r1r1r1r1 $
       /:[b>e<]2..[>dg<][>ea<][>g>c<<]2[>a>d<<]2r8:/4
       rrrr rrrr
      `
      },

    {
      name: 'base drum',
      channel: 3,
      mml:
      `s0.01,0.01,1.0,0.05 o5 t160 @10 v60 q10 l4
      bbbb bbbb bbbb bbbb 
      $
      l4q10/:bbbb bbbb bbbb bbbb:/4
      /:l16q20brrr rrbr rrbr rrbr q10l8brbrbbbr q20l16bbrr rrbr rrbr rrbr q10l8brbrq20l16bbbbl8br :/2
      `
    }
    ,
    {
      name: 'snare',
      channel: 4,
      mml:
      `s0.01,0.01,1.0,0.05 o5 t160 @21 v60 q80 $/:l4rbrb:/3l4rbrl16bbbb`
    }
    ,
    {
      name: 'hi hat',
      channel: 5,
      mml:
      `s0.01,0.01,1.0,0.05 o6 t160 @11 l16 q40 $ v15 c v8 cv20cv8c`
    }
    // ,
    // {
    //   name: 'part5',
    //   channel: 4,
    //   mml:
    //   `s0.01,0.01,1.0,0.05 o5 t160 @20 q95 $v20 l4 rrrg `
    // }
  ]
};


// export var seqData = {
//   name: 'Test',
//   tracks: [
//     {
//       name: 'base',
//       channel: 1,
//       mml:
//         `
//        s0.001,0.2,0.2,0.03 @4
//        t230  q70 v25 o3 l8 ffff r4 ffff r4 ffff r4 ffff r4 ffff r4 ffff r4 ffff r8f
//       `
//      },
//     {
//       name: 'melo1',
//       channel: 2,
//       mml:
//         `
//         s0.001,0.1,1.0,0.001 @5     
//         t230  q100 v20 o6 l8 
//         f2r8cfa>c<ar8f gr8ggr8d4^16r16gf8r8e 
//         f2r8cfa>c<ar8f g-r8g-g-r8f2^8
//         @0 $ 
//         t140 l16
//         c>c<b>cec<b>c<
//         c>c<b->cec<b->c<
//         c>c<a>cec<a>c<
//         c>c<a->cec<a->c<

//         `
//     },
//     {
//       name: 'melo2',
//       channel: 3,
//       mml:
//         `
//         s0.001,0.1,1.0,0.001 @4 t230  q100 v20 o5 l8 
//         a2r8aa>cfc<r8a a+r8a+a+r8a+4^16r16a+a+r8a+ 
//         a2r8aaaaar8a a+r8a+a+r8a2^8
//       `
//     },
//         {
//       name: 'base',
//       channel: 3,
//       mml:
//       `s0.01,0.01,1.0,0.05 o5 t140 @10 v60 q20 $l4gggg`
//     }
//   ]
// };

export var soundEffectData = [
  // 0
  {
    name: '',
    tracks: [
      {
        channel: 12,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.02 @1 t280 q127 v5 l128 o8 fgab < cde'
      },
      {
        channel: 13,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.02 @1 t280 q127 v5 l128 o3 c>f<g>a<b > cd'
      }
    ]
  },
  // 1
  {
    name: '',
    tracks: [
      {
        channel: 14,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.02 @4 t350 q127 v10 l128 o6 g ab<bagfedcegab>bagfedc>dbagfedc'
      }
    ]
  },
  // 2 
  {
    name: '',
    tracks: [
      {
        channel: 14,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.0001 @4 t150 q127 v10 l128 o6 cdefgab>cdef<g>a>b<a>g<f>e<e'
      }
    ]
  },
  // 3 
  {
    name: '',
    tracks: [
      {
        channel: 14,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.0001 @5 t200 q127 v20 l64 o6 c<c>c<c>c<c>c<'
      }
    ]
  },
  // 4 
  {
    name: '',
    tracks: [
      {
        channel: 15,
        oneshot: true,
        mml: 's0.0001,0.0001,1.0,0.01 @8 t120 q127 v40 l2 o0 c'
      }
    ]
  }
];

