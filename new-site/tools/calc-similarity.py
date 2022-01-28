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
model = Doc2Vec.load("../data/model/doc2vec.model")
# 類似度データの格納テーブルを作成する
con.execute("""
  CREATE TABLE IF NOT EXISTS similars
  (id INTEGER, similarId INTEGER, similarity REAL,PRIMARY KEY(id, similarId))
  """)

# ドキュメントそれぞれに対して類似度が高いドキュメントの上位10個を求めてDBに格納する
con.execute("BEGIN TRANSACTION")
for row in con.execute('SELECT id FROM contents where separatedContent is not null'):
  similars = model.docvecs.most_similar(row[0])
  similars_json = json.dumps(similars)
  con.execute('UPDATE contents SET similars = ? WHERE id = ?', (similars_json, row[0]))
  for similar in similars :
    con.execute("replace into similars(id,similarid,similarity) values (?,?,?)", (row[0], similar[0], similar[1]))
  
con.execute("COMMIT TRANSACTION")
con.close()
os.chdir(cwd)