cd .\res
for %%v in (*.wav) do ffmpeg -i %%v -ar 8000 -acodec pcm_u8 -y ".\out\\%%v"
cd ..
node makeSample
