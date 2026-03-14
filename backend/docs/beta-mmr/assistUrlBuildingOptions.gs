function assistUrlBuildingOptions()
{
  
  var headers = 
      {
       accept : "application/json, text/plain, */*",
       'accept-encoding' : "gzip, deflate, br",
        'accept-language' : "en-US,en;q=0.5",

       dnt : "1",
    
       'api-key' : "1ef80bd7-e8da-4b50-aeae-eecec2f27423" ,

Authorization: 
         'Bearer GB.E8D4Zlm57soyexnhb0iwI8CE-ukIFYmWxn20KUt5GlmepiIeWOo9-94t0JkYKy_ZxrsBQB9P7gx-xnMHcxKaKbW0MNfq0sFi4caNrV9qH9J7e6jkvLQYogsJMqO46WwjyeOt',

        
       'user-agent' :
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36",
      Connection: "keep-alive",
       origin : "https://www.mapmyride.com",
       'sec-fetch-site' : "cross-site",
       'sec-fetch-mode' : "cors",
       'sec-fetch-des' : "empty",
       referer : "https://www.mapmyride.com/",
       'accept-language' : "en-US,en;q=0.9,ml;q=0.8",
        'TE' : 'trailers',
        'branch_key':
             "key_live_gaQahXo6VOcbLwiQTKiyXlalCBdsGnKP",
        token:
             "8f363a00-3c09-11eb-8080-80006993d695",
        
        'feed_id':
             "36062723"
     };
    var options = 
     {
        method:"GET",
        "headers": headers,  
        followRedirects : true,
        muteHttpExceptions: true
     };
     return options;
}