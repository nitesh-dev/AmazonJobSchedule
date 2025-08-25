


let token = "AQICAHidzPmCkg52ERUUfDIMwcDZBDzd+C71CJf6w0t6dq2uqwF0Wkifs0qAJpGJ62qufC+qAAAEUjCCBE4GCSqGSIb3DQEHBqCCBD8wggQ7AgEAMIIENAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAzCOZKv39XajK2Z+QcCARCAggQFaeYnjnATFruxXM9xLDk17+c9FHIwKTRi+Kne1X3Zh7TE5o9RfhfYob/17C3iUKSHTfkdQHbxxpbXqIBk/lbC5iBJZlClBdhjUoBYKAOcW/NgN9QzfaIKUbXwXBducLLYMNWf7OtovIQklv9GpTlOIIVUkLs7zqKyZuHD9pokVYqmeZqJhArjmYINXBN1yi/FqFgdFboFPwaIO8lr7jwabt32ZV90u2HpdiXJ34FXelSMEBZnEiMovIrVS2+oFkYMLiwnxEWk3oSv/fY7zdy9538XDMJnl73cb1WwFiryeovheIViSMroA/XGH9tk6Z70RaO3+FYNibOh1QHgAac956r03z2GIUmM+LHGtKtiTWKoW5cHRP+rmJZOCy/klw+hv0QnlEJgxbE7zfIU0imLCPlFmkXoP2f5X606WRfPn++Zw9lDfi8g7Ol3YxefIqTKHhJhZ/ixN5x/ejTfBeqsmtWaspQLCmB5X1byQWcrMUvsH2ZJL0k2Ad79GDR0uOcg/dp9oLUZB0nSO/isbMWbzuXqJdmio1c+Lxx+y2oo7b4PIQxNxPGJhvCXkLH1Z+MiZN/08st2r1EPl6ZiHtYZRuCl6ad6wu4gsP/dgpX4yJtibGYN5ZL770cbZWtKZ5NAdco1pDVOtoxwzqbqnlhz4ssZFmMY66tsVw3B0WrOxIaQiFCZMStxj7Bhmq3xpDgbQiuN1TEA9h7KV45N07MIfYNUf0O5rsSSzKlQ2uYSkcMEu9emGdab7scBafjQ2iIYmKEAg4Q4LkT4UZCT6tDFGQ7vbSlFFAMACV29ga2Givn9002JtoHREiRgj0DkyTjlLX7vUsCqOl1lPjlJk6Rg8oZbwrbqmIW13X+TaS5+AYn0LWmOJxbq/WRbPBDy7E0qUb5CEzAHPA8xw72dNR0Y0gUpo15HsYeE8tiw6JsGnoB4HUIgHo3CofxbCXq7KMOMcroZvJ98ZX0471X2qnGykXeUraG3Fl1jTgJY22gN86hFadRaHbxNJddkTZlZhmUGT5NiGeOvqigvPbxp5I1Pvdv39pps0nQfv9uiTR5YGj3isKMICXy7z66zXJGWKzwLDNXzw6Nfh2e8r4WkYd3q8Cc8dtZ0FkvRlJtEKyu3AljaPZpCzTwmnCBVyMGcvjqcVBc03RG90Lt+I021il8/RkvLGj7Fg9UPgm6iGFdalfp0a1S75zhdhsmCRy2Wk4mgzZJ7SK0UjwDVcqNTiyl+S7vy4vQv4WSKRtUCyaQFUlU0/q+rCuPodqwFWM8ufYOd/2UvSu9rfA98wckI0yf8Ht5Ayk1QSeiXRzWiFfjSQqpHaJXFzSzEQoBfwKiyNlFTbrDuYK+SxpFYyGs43fRTsR1Y58cA"

async function allJobs() {
    const myHeaders = new Headers();
    myHeaders.append("accept", "*/*");
    myHeaders.append("accesstoken", token);
    myHeaders.append("authorization", "Bearer token");
    myHeaders.append("content-type", "application/json");
    myHeaders.append("country", "United States");

    myHeaders.append("user-agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36");

    const graphql = JSON.stringify({
        query: "query queryApplicationsByBBCandidateIdV2($locale: String!, $bbCandidateId: String!) {\n  queryApplicationsByBBCandidateIdV2(\n    locale: $locale\n    bbCandidateId: $bbCandidateId\n  ) {\n    didAllApplicationsLoaded\n    applications {\n      active\n      applicationId\n      applicationState\n      \n    }\n    __typename\n  }\n}\n",
        variables: { "locale": "en-US", "bbCandidateId": "f4f43450-e4c1-11ee-b7a8-392690712bb5" }
    })
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: graphql,
        redirect: "follow"
    };

    fetch("https://zuzm2l7jovcizd7movvfj7qt3y.appsync-api.us-east-1.amazonaws.com/graphql", requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));

}