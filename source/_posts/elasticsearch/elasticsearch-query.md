---
title: elasticsearch 查询
categories:
  - Java
tags:
  - Java
  - elasticsearch
date: 2022-06-29 12:47:35
updated: 2022-06-29 12:47:35
---
# 分页

```
GET /_search
{
    "from" : 0, "size" : 10,
    "query" : {
        "term" : { "user" : "kimchy" }
    }
}
```

# 排序

```
POST /_search
{
   "query" : {
      "term" : { "product" : "chocolate" }
   },
   "sort" : [
      {"price" : {"order" : "asc", "mode" : "avg"}}
   ]
}
```

# in 或者 not in 查询

```
GET /kibana_sample_data_logs/_search
{
  "query": {
    "bool": {
    // must是：in 查询，must_not：是 not in 查询
      "must": [
        {
          "terms": {
            "clientip": ["118.151.35.151", "254.207.11.2"]
          }
        }
      ]
    }
  },
  "sort": [
    {
      "utc_time": {
        "order": "desc"
      }
    }
  ],
  "from": 0, "size": 20
}

BoolQueryBuilder boolBuilder = QueryBuilders.boolQuery();
boolBuilder.must(QueryBuilders.matchPhraseQuery("param", "1"));
boolBuilder.must(QueryBuilders.matchPhraseQuery("param", "2"));
boolBuilder.must(QueryBuilders.matchPhraseQuery("param", "3"));
```

# or and 条件查询

```
1.must
文档 必须 匹配这些条件才能被包含进来。相当于sql中的 and
2.must_not
文档 必须不 匹配这些条件才能被包含进来。相当于sql中的 not
3.should
如果满足这些语句中的任意语句，将增加 _score ，否则，无任何影响。它们主要用于修正每个文档的相关性得分。相当于sql中的or
4.filter
必须 匹配，但它以不评分、过滤模式来进行。这些语句对评分没有贡献，只是根据过滤标准来排除或包含文档。

构造查询条件
1. termQuery：精确查询（不分词）
使用termQuery要注意的是，Elasticsearch5之后，取消了string类型，将原来的string类型拆分为text和keyword两种类型，他们的区别在于text会对字段进行分词处理，而keyword则不会。
2. matchQuery：匹配查询（分词）
match query搜索的时候，首先会解析查询字符串，进行分词，然后查询，所以假如我搜索的条件输入的是"六年级"，则会把各个年级（一年级至九年级）的数据都查询出来，因为其中都包含’年级’ 。
3. queryString：精确查询
4. wildcardQuery：模糊查询
5. rangeQuery：范围查询
```

# 多字段搜索

```
GET /kibana_sample_data_logs/_search
{
  "query": {
    "multi_match": {
      "query": "你好 www.elastic.co Chrome",
      "fields": ["message", "host"]
    }
  }
}
```

# operator: 可以设置为 or(默认) 或者 and

```
和分词有关系：
如：数据是：万里长城真伟大
分词后：["万里长城", "万里","万","里长","里","长城" ...]
为or时：
索引库中，只要文档的content这个字段内容包含“万里长城”，“里”，“真”，“伟大”等任何一个分词，该条文档就会被索引到。

为and时：
索引库中，文档的content这个字段必须包含“万里长城”，“里”，“真”，“伟大”等所有分词 ，这就是and。
```

# java api

[java api](https://www.bbsmax.com/A/B0zqrrEZJv/)

# 注意点 RefreshPolicy

```
默认情况下ElasticSearch索引的refresh_interval为1秒，这意味着数据写1秒才就可以被搜索到。

每次索引refresh会产生一个新的 lucene 段，这会导致频繁的 segment merge 行为，对系统 CPU 和 IO 占用都比较高。

如果产品对于实时性要求不高，则可以降低刷新周期，如：index.refresh_interval: 120s。

但是这种特性对于功能测试来说比较麻烦：

因为实时性不能保证，所以每次插入测试数据之后，都需要sleep一段时间，才能进行测试。
因为实时性不能保证，及时通过sleep策略通过的case，也可能偶尔失败。
为了解决上述问题，需要提供ElasticSearch增删改数据之后数据立即刷新的策略。
可知有以下三种刷新策略：

RefreshPolicy#IMMEDIATE:
请求向ElasticSearch提交了数据，立即进行数据刷新，然后再结束请求。
优点：实时性高、操作延时短。
缺点：资源消耗高。
RefreshPolicy#WAIT_UNTIL:
请求向ElasticSearch提交了数据，等待数据完成刷新，然后再结束请求。
优点：实时性高、操作延时长。
缺点：资源消耗低。
RefreshPolicy#NONE:
默认策略。
请求向ElasticSearch提交了数据，不关系数据是否已经完成刷新，直接结束请求。
优点：操作延时短、资源消耗低。
缺点：实时性低
updateRequest.setRefreshPolicy(WriteRequest.RefreshPolicy.WAIT_UNTIL);
每笔500ms以上，特别影响性能。尽量不要使用
```
