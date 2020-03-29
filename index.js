const axios = require("axios");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const oss = require("ali-oss");
const cheerio = require("cheerio");
const { execSync } = require("child_process");

const wait = promisify(setTimeout);

const ua = {
  pc: "",
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"
};

const cookie =
  "nav_switch=booklist; _ga=GA1.2.1577300004.1584887906; _gid=GA1.2.1221612037.1584887906; _gat_gtag_UA_155142884_1=1";

const store = oss({
  accessKeyId: "LTAIGLORmukNzzAm",
  accessKeySecret: "GJWwPFOyMEGHdLwUGv2tibaIHxzucF",
  region: "oss-cn-shanghai"
});
store.useBucket("familyweb");

const images = [];

async function upload(url, filename, album) {
  try {
    const ret = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { Referer: "http://www.no-banana.com/", cookie }
    });
    fs.writeFileSync("image/" + filename, ret.data, async err => {
      try {
        if (err) {
          console.log(err);
          return;
        }
        console.log("保存成功");
        await store.put(
          `manhua/${album}/${filename}`,
          path.resolve(__dirname, "image/" + filename)
        );
        images.push(`manhua/${album}/${filename}`);
        // 删除
        //   execSync(`rm image/${filename}`);
        fs.writeFileSync(`${album}.json`, JSON.stringify(images));
        await store.put(
          `manhua/${album}.json`,
          path.resolve(__dirname, `${album}.json`)
        );
      } catch (e) {
        console.log("e1", e);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

init();

async function init() {
  try {
    const album = 609;
    const homePage = `http://www.no-banana.com/book/${album}`;
    await wait(3000);
    console.log("------------wait----------");
    const homePageHtml = await axios.get(homePage, {
      headers: {
        "User-Agent": ua.mobile,
        Referer: "http://www.no-banana.com/",
        cookie
      }
    });
    console.log("------------homepage----------");
    const $ = cheerio.load(homePageHtml.data, { decodeEntities: false });
    const list = $("html").find("#detail-list-select > li");
    for (let i = 0; i < list.length; i++) {
      const chapterUrl =
        "http://www.no-banana.com" +
        $(list[i])
          .find("a")
          .attr("href");
      console.log("--------------wait---------------chapterUrl");
      await wait(3000);
      console.log(chapterUrl);
      const chapterData = await axios.get(chapterUrl, {
        headers: {
          "User-Agent": ua.mobile,
          Referer: "http://www.no-banana.com/",
          cookie
        }
      });
      const $1 = cheerio.load(chapterData.data, { decodeEntities: false });
      const list1 = $1("html").find("#cp_img > img");
      for (let j = 0; j < list1.length; j++) {
        const imgurl =
          "http://www.no-banana.com" +
          ($1(list1[j]).attr("data-src") || $1(list1[j]).attr("src"));
        const filename = imgurl.split("/").slice(-1)[0];
        // 存储图片
        await wait(3000);
        console.log("------------wait----------");
        upload(imgurl, filename, album);
      }
    }
  } catch (e) {
    console.log(e);
  }
}
