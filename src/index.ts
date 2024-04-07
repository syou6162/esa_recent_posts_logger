import { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';

import { subDays } from 'date-fns'
import format from 'date-fns/format';
import { convertToTimeZone } from 'date-fns-timezone';

export type EsaConfig = {
  teamName: string;
  accessToken: string;
}

export type EsaPost = {
  // esaのレスポンスを全部camelcaseに変換するのは面倒なので、ここだけlintは無視する
  body_md: string; // eslint-disable-line camelcase
  body_html: string; // eslint-disable-line camelcase
  number: number;
  name: string;
  category: string;
  full_name: string;
  wip: boolean;
}

export type EsaSearchResult = {
  posts: EsaPost[];
  total_count: number;
}

const env = process.env
const teamName = env.ESA_TEAM_NAME || ""
const accessToken = env.ESA_ACCESS_TOKEN || ""

const timeZone = "Asia/Tokyo"


export function getEsaConfig(): EsaConfig {
  const config: EsaConfig = { teamName, accessToken };
  return config;
}

export function createAxiosClient(accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: 'https://api.esa.io',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    responseType: 'json',
  });
}

async function getUpdatedPosts(
  axios: AxiosInstance,
  esaConfig: EsaConfig,
  from: Date,
  to: Date,
): Promise<EsaSearchResult> {
  const fromStr = `${format(convertToTimeZone(from, { timeZone: timeZone }), 'yyyy-MM-dd') as string}`
  const toStr = `${format(convertToTimeZone(to, { timeZone: timeZone }), 'yyyy-MM-dd') as string}`
  const response = await axios.get<EsaSearchResult>(`/v1/teams/${esaConfig.teamName}/posts`, {
    params: {
      q: `updated:>=${fromStr} updated:<${toStr}`,
    },
  });
  return response.data;
}


async function createOrUpdatePost(
  axios: AxiosInstance,
  esaConfig: EsaConfig,
  category: string,
  appendedText: string,
): Promise<EsaPost> {
  const response = await axios.get<EsaSearchResult>(`/v1/teams/${esaConfig.teamName}/posts`, {
    params: {
      q: `category:${category}`,
    },
  })
  if (response.data.total_count > 1) {
    console.log('複数の日報が存在します');
    process.exit(1);
  }
  if (response.data.total_count === 0) {
    return axios.post<EsaPost>(`/v1/teams/${esaConfig.teamName}/posts`, {
      post: {
        name: '日報',
        category,
        body_md: appendedText,
        wip: false,
      },
    }).then((res: AxiosResponse<EsaPost>) => {
      return res.data;
    })
  }
  return axios.patch<EsaPost>(`/v1/teams/${esaConfig.teamName}/posts/${response.data.posts[0].number}`, {
    post: {
      category,
      body_md: `${response.data.posts[0].body_md}\n${appendedText}`,
      wip: false,
    },
  }).then((res: AxiosResponse<EsaPost>) => {
    return res.data;
  })
}

const esaConfig = getEsaConfig()
const axiosClient = createAxiosClient(esaConfig.accessToken)

const today = new Date()
const yesterday = subDays(today, 1)

getUpdatedPosts(axiosClient, esaConfig, yesterday, today).then((result: EsaSearchResult) => {
  const category = `日報/${format(convertToTimeZone(yesterday, { timeZone: timeZone }), 'yyyy/MM/dd') as string}`
  const posts = result.posts.filter((post: EsaPost) => {
    return post.category !== category
  })
  if (posts.length > 0) {
    let text = "## 本日修正された記事\n"
    posts.forEach((post: EsaPost) => {
      text += `- [${post.full_name}](https://${esaConfig.teamName}.esa.io/posts/${post.number})\n`
    })
    createOrUpdatePost(axiosClient, esaConfig, category, text).catch(err => {
      console.log(err);
      process.exit(1);
    })
  }
}).catch(err => {
  console.log(err);
  process.exit(1);
})
