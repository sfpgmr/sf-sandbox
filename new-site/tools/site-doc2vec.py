import sqlite3
import os
import json

from gensim.models.doc2vec import Doc2Vec
from gensim.models.doc2vec import TaggedDocument

# カレントディレクトリをバックアップ
cwd = os.getcwd()

# カレントディレクトリを変更
os.chdir(os.path.dirname(__file__))
con = sqlite3.connect('../data/db/site-info.db')

# 学習データの作成
training_docs = []
for row in con.execute('SELECT id,separatedContent FROM contents where separatedContent is not null'):
  words = json.loads(row[1])
  training_docs.append(TaggedDocument(words=words, tags=[row[0]]))

# モデルの作成
model = Doc2Vec(documents=training_docs, 
  vector_size=100,
  min_count=10,
  window=15,
  epochs=30)

# モデルの保存
with open("../data/model/doc2vec.model", "wb") as f:
  model.save(f)
# DBのクローズ
con.close()
# 初期ディレクトリに戻る
os.chdir(cwd)