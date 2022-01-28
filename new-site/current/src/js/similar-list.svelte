<script>
  let siteInfos = [];
  let siteInfoFragments = [];
  let page = 1;
  let maxPage = 0;
  let row = 30;
  let detailVisibility = false;
  let promise = fetch("./site-info.json")
    .then(r => r.json())
    .then(data=>{
      siteInfos = data;
      siteInfoFragments = data.slice(0,row);
      maxPage = Math.ceil(data.length/row);
    });

  function pageUp(){
    if(page == 1) {
      return;
    }
    page -= 1;
    siteInfoFragments = siteInfos.slice(page*row-row,page*row);
  }

  function pageDown  (){
    if(page >= maxPage) {
      return;
    }
    page +=1;
    siteInfoFragments = siteInfos.slice(page*row-row,page*row);
  }

  function setPage(){
    if(page < 1){
      page = 1;
    }

    if(page > maxPage){
      page = maxPage;
    }

    siteInfoFragments = siteInfos.slice(page*row-row,page*row);

  }

  function detailVisibilityButtonClick(){
    detailVisibility = !detailVisibility;
  }
</script>
<style>
  table td,th {
    max-width:500px;
  }
  td,a {
    word-wrap:break-word;
  }

</style>
<main class="content">

  {#await promise}
<p>....ローディング中</p>
{:then dummy}
<div class="hero">
  <header class="hero-body">
    <h1 class="title">コンテンツと類似するコンテンツをdoc2vecで求める</h1>
    <div class="block">
      <p>自サーバーのコンテンツ分析を行っており、doc2vecを用いて、自サーバー内のコンテンツと類似するコンテンツを求めることによって関連コンテンツの自動リンク設定や、分類ができないか試しています。</p>
       <p>このリストは、sfpgmr.netサイト内のコンテンツ同士の類似度をdoc2vecで求めた結果です。1つのコンテンツに対して類似度を求め、類似度が0.8以上のものを類似度が高い順から最大10個表示するようにしています。
      </p>
      <div class="columns is-centered">
        <div class="column is-narrow">
          <button class="button is-info" on:click|preventDefault={detailVisibilityButtonClick} >{detailVisibility ? "続きを非表示" : "...続きを読む"}</button>
        </div>
      </div>
      <div class={!detailVisibility ? "is-hidden" : ""}>
      <p>
        以下のステップで作成しています。
      </p>
      <ol>
        <li>まず</li>
      </ol>
      </div>
    </div>
    </header>
</div>
<nav class="level">
  <div class="level-left">
    <div class="level-item"><p class="subtitle">Page</p></div>
    <div class="level-item">
      <div class="control">
        <input bind:value={page} on:change={setPage} size="10" class="input">
      </div>
    </div>
    <div class="level-item">/{maxPage}</div>
  </div>
  <div class="level-left">
    <div class="level-item">
      <button class="button" on:click={pageUp} disabled={page<=1} >＜</button>
    </div>
    <div class="level-item">
      <button class="button" on:click={pageDown} disabled={page==maxPage}>＞</button>
    </div>
  </div>
</nav>
<div class="table-container">
  <table class="table is-bordered is-striped is-fullwidth">
    <thead>
      <tr>
        <th>コンテンツ</th>
        <th>類似コンテンツ</th>
        <th>類似度(0.0-1.0)</th>
      </tr>
    </thead>
    <tbody>
  {#each siteInfoFragments as content }
    <tr>
      <td>
        <div>
          <a href={content.contentPath} target="_blank" >{content.contentId}
            {content.contentTitle || 'タイトルなし'}<br>
            {content.contentPath}        
          </a>

        </div>
        
        <div>
          {content.contentDescription || '説明なし'}
        </div>
     </td>
      <td>
        <div>
          <a href={content.similarContentPath} target="_blank" >{content.similarContentID}
            {content.similarContentTitle || 'タイトルなし'}
            <br>
            {content.similarContentPath}        
            </a>
        </div>
        <div>
          {content.similarContentDescription || '説明なし'}
        </div>
      </td>
      <td>
        {content.similarity}
      </td>
    </tr>
  {/each}
  </tbody>
  <tfoot>
    <tr>
      <th>コンテンツ</th>
      <th>類似コンテンツ</th>
      <th>類似度(0.0-1.0)</th>
    </tr>
  </tfoot>
  </table>
  
</div>
{/await}
</main>
<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <a href="https://sfpgmr.net/">&copy; Satoshi Fujiwara</a>.
     </p>
  </div>
</footer>