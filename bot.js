const { default: axios } = require("axios");
const { Telegraf, Markup } = require("telegraf");
const { format, parseISO } = require("date-fns");

let topic;

const bot = new Telegraf([process.env.BOT_TOKEN]);

const fetchSpaces = async (state) => {
  const response = await axios.get("https://api.twitter.com/2/spaces/search", {
    params: {
      query: topic,
      expansions: "creator_id",
      "space.fields":
        "title,host_ids,scheduled_start,started_at,lang,participant_count",
      "user.fields": "name,username,profile_image_url",
      state: `${state}`,
    },
    headers: {
      Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
    },
  });

  if (response.status === 200) {
    const spaces = response.data.data;
    const users = response.data.includes.users;
    spaces.forEach((space) => {
      users.forEach((user) => {
        if (space.creator_id === user.id) {
          space.creator_id = user;
        }
      });
    });
    return spaces;
  } else {
    console.log(response.data);
  }
};

const trimArray = (array) => {
  if (array.length > 10) {
    return array.splice(0, 10);
  } else {
    return array;
  }
};

//bot commands

bot.start((ctx) => {
  ctx.replyWithHTML(
    `Hey <b>${ctx.from.first_name}!</b>\n<i>I will help you in searching for interesting spaces happening on twitter.</i>\nCommon topics to look for:\n<b>nft, web3, chill, music, finance, startup, health</b>\n<b>Go on and type something...</b>`
  );
});

const messageFormat = (ctx, space) => {
  if (space.creator_id.profile_image_url !== undefined) {
    return ctx.replyWithPhoto(
      { url: space.creator_id.profile_image_url },
      {
        caption: `<b><i>${space.title}</i></b>\n<b>${
          space.state === "live"
            ? `Participants: ${space.participant_count}`
            : `Starting on: ${format(
                parseISO(space.scheduled_start),
                "hh:mm, MMM dd"
              )}`
        }</b>\n<b>Host: <a href="http://www.twitter.com/${
          space.creator_id.username
        }">${space.creator_id.name}</a></b>`,
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          Markup.button.url(
            space.state === "live" ? "Join" : "Schedule",
            `https://twitter.com/i/spaces/${space.id}`
          ),
        ]),
      }
    );
  }
};

bot.on("text", async (ctx) => {
  // Using context shortcut
  topic = ctx.update.message.text;
  ctx.reply("Please select the state of the spaces", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Live", callback_data: "live" },
          { text: "Scheduled", callback_data: "scheduled" },
          { text: "All", callback_data: "all" },
        ],
      ],
    },
  });
});

bot.action("live", async (ctx) => {
  const spaces = await fetchSpaces("live");
  const trimmedSpaces = trimArray(spaces);
  ctx.reply("Here are the ongoing spaces for your searched topic");
  trimmedSpaces.forEach((space) => {
    messageFormat(ctx, space);
  });
});

bot.action("scheduled", async (ctx) => {
  const spaces = await fetchSpaces("scheduled");
  const trimmedSpaces = trimArray(spaces);
  ctx.reply("Here are the scheduled spaces for your searched topic");
  trimmedSpaces.forEach((space) => {
    messageFormat(ctx, space);
  });
});

bot.action("all", async (ctx) => {
  const spaces = await fetchSpaces("all");
  const trimmedSpaces = trimArray(spaces);
  ctx.reply("Here are the spaces for your searched topic");
  trimmedSpaces.forEach((space) => {
    messageFormat(ctx, space);
  });
});

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  ctx.reply("Sorry! I couldn't find any spaces according to your topic");
});

module.exports = bot;
