<script>
  let siteInfos = [];
  let siteInfoFragments = [];
  let page = 1;
  let maxPage = 0;
  let row = 30;
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

  function pageDown(){
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
<header>
  
<h1 class="title">コンテンツと類似するコンテンツをdoc2vecで求めた結果</h1>
</header>
<p>
  <button class="button" on:click={pageUp} disabled={page<=1} >＜</button>
  <button class="button" on:click={pageDown} disabled={page==maxPage}>＞</button>
  
</p>
<p>page:<input bind:value={page} on:change={setPage} size="10">/{maxPage}</p>
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