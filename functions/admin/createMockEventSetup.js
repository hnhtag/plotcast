const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { nanoid } = require('nanoid');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;
const DEFAULT_AUTO_SHOW_ANSWERS = true;
const DEFAULT_ANSWER_TIMER_SEC = 45;

function storyOption(text, score) {
  return { id: nanoid(8), text, score };
}

function storyGroup(title, options) {
  return { id: nanoid(8), title, options };
}

function buildMockStories() {
  return [
    {
      title: 'The Coffee Machine Uprising',
      story:
        'Monday morning. The office coffee machine displays: "Insert compliment before espresso." A queue forms. Everyone is sleepy and dramatic.',
      keyTakeaway: 'When chaos hits, the best leaders turn panic into playful teamwork.',
      optionGroups: [
        storyGroup('You step forward and...', [
          storyOption('Give the machine a heartfelt pep talk.', 8),
          storyOption('Reboot it and open a backup coffee station.', 12),
          storyOption('Declare tea-only policy and run.', -6),
        ]),
      ],
    },
    {
      title: 'The Mystery KPI Spreadsheet',
      story:
        'A spreadsheet appears with 47 tabs, all named "final_v2_real_final". Nobody knows who owns it, but leadership wants answers in 20 minutes.',
      keyTakeaway: 'Clarity beats heroics: align owners, assumptions, and timeline fast.',
      optionGroups: [
        storyGroup('What do you do first?', [
          storyOption('Assign owners per tab and define one source of truth.', 14),
          storyOption('Guess the numbers and hope confidence looks convincing.', -10),
          storyOption('Create a short war-room plan and triage highest-impact tabs.', 10),
        ]),
      ],
    },
    {
      title: 'The Meeting That Could Have Been an Email',
      story:
        'The meeting has no agenda, no host, and somehow 26 attendees. Five minutes in, someone says, "Let us circle back to circles."',
      keyTakeaway: 'Respect people time: purpose, outcomes, and ownership win every time.',
      optionGroups: [
        storyGroup('Your move:', [
          storyOption('Politely propose agenda + decision owner on the spot.', 11),
          storyOption('Stay silent and screenshot memes in the chat.', -5),
          storyOption('End early and send concise summary with next actions.', 13),
        ]),
      ],
    },
    {
      title: 'The Production Bug at Lunch',
      story:
        'At 12:03 PM, production says hello with a red dashboard. Half the team is holding noodles, the other half is holding panic.',
      keyTakeaway: 'Calm incident response is a team sport: communicate, contain, recover.',
      optionGroups: [
        storyGroup('Choose your response:', [
          storyOption('Open incident channel, assign roles, and post updates every 10 min.', 15),
          storyOption('Patch directly on main and pray to the deploy gods.', -14),
          storyOption('Roll back safely first, then debug with logs and timeline.', 12),
        ]),
      ],
    },
  ];
}

function buildMockCharacters() {
  return [
    {
      name: 'Chaos Intern',
      description: 'You bring energy, surprise, and occasional accidental outages. High potential, needs guardrails.',
      encouragement: 'Rough rounds are not the ending. Use this as a stepping stone and make the next call with more intent.',
      imageEmoji: '🤹',
      minScore: -999,
      maxScore: 5,
    },
    {
      name: 'Deadline Ninja',
      description: 'You move fast, keep things alive, and somehow still reply with bullet points.',
      encouragement: 'You already have momentum. Keep refining the small decisions and the next jump gets easier.',
      imageEmoji: '🥷',
      minScore: 6,
      maxScore: 24,
    },
    {
      name: 'Meeting Alchemist',
      description: 'You turn confusing conversations into crisp plans and clear accountability.',
      encouragement: 'You are building real signal. Stay consistent and keep turning ambiguity into progress.',
      imageEmoji: '🧪',
      minScore: 25,
      maxScore: 39,
    },
    {
      name: 'Firefighter Supreme',
      description: 'You stay calm in incident storms and lead with structure under pressure.',
      encouragement: 'Strong base. Keep trusting the process and you will convert pressure into even bigger wins.',
      imageEmoji: '🚒',
      minScore: 40,
      maxScore: 54,
    },
    {
      name: 'Legendary Ops Wizard',
      description: 'You align teams, ship outcomes, and leave systems better than you found them.',
      encouragement: 'You are setting the bar. Keep stretching the team and turn this finish into your new floor.',
      imageEmoji: '🧙',
      minScore: 55,
      maxScore: 999,
    },
  ];
}

module.exports = async function createMockEventSetup(c) {
  const eventId = nanoid(8);
  const createdAt = new Date().toISOString();
  const title = 'Mock Event: Office Multiverse';

  const stories = buildMockStories();
  const characters = buildMockCharacters();

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `EVENT#${eventId}`,
      SK: 'META',
      entityType: 'EVENT',
      eventId,
      title,
      status: 'waiting',
      currentStoryIndex: -1,
      totalStories: stories.length,
      // Seed with answer-flow defaults so mock events fully exercise timer/open behavior.
      autoShowAnswers: DEFAULT_AUTO_SHOW_ANSWERS,
      answerTimerSec: DEFAULT_ANSWER_TIMER_SEC,
      answersOpen: false,
      answersOpenedAt: null,
      createdAt,
    },
  }));

  for (let i = 0; i < stories.length; i += 1) {
    const story = stories[i];
    const sk = `STORY#${String(i).padStart(3, '0')}`;
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: sk,
        storyIndex: i,
        title: story.title,
        story: story.story,
        keyTakeaway: story.keyTakeaway,
        optionGroups: story.optionGroups,
        voteCounts: {},
        totalVotes: 0,
        createdAt,
      },
    }));
  }

  for (const character of characters) {
    const characterId = nanoid(8);
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `CHARACTER#${characterId}`,
        characterId,
        name: character.name,
        description: character.description,
        encouragement: character.encouragement || '',
        imageEmoji: character.imageEmoji,
        minScore: character.minScore,
        maxScore: character.maxScore,
        createdAt,
      },
    }));
  }

  return c.json({
    ok: true,
    eventId,
    title,
    stories: stories.length,
    characters: characters.length,
    autoShowAnswers: DEFAULT_AUTO_SHOW_ANSWERS,
    answerTimerSec: DEFAULT_ANSWER_TIMER_SEC,
  });
};
