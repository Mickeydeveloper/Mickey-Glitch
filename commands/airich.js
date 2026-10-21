const { ButtonV2 } = require('../lib/messageBuilder');

const FEATURE_GROUPS = [
  ['Map', 'Sports', 'Video', 'Reminder'],
  ['Comment', 'Search Planner', 'Consent', 'Calendar'],
  ['Media Grid', 'Quiz', 'Action Group', 'Comparison'],
  ['HTML App', 'A2UI', 'Bloks', 'Footer CTA'],
  ['Place Item', 'Social Entity', 'Product Item', 'Thread Surfing']
];

const FEATURE_SUMMARY = {
  Map: 'GenAIMapPrimitive + placeItem() + locationPermissionSection()',
  Sports: 'GenAISportsWidgetPrimitive + sportsSection()',
  Video: 'GenAIVideoPrimitive + videoSection()',
  Reminder: 'GenAIReminderPrimitive + reminderSection()',
  Comment: 'GenAICommentPrimitive + commentSection()',
  'Search Planner': 'GenAISearchPlannerStepsPrimitive + plannerStep()',
  Consent: 'GenAIProfessionalConsentPrimitive + professionalConsentSection()',
  Calendar: 'GenAI3PExtWidgetPrimitive + calendarWidgetSection()',
  'Media Grid': 'Grid layout + mediaGridSection()',
  Quiz: 'GenAIQuizPrimitive + quizSection()',
  'Action Group': 'GenAIActionGroupPrimitive + actionGroupSection()',
  Comparison: 'GenAIFusedComparisonTablePrimitive + fusedComparisonSection()',
  'HTML App': 'GenAIaeacdsnwHtmlPrimitive + htmlSection()',
  A2UI: 'A2UI surface + a2uiSurface() / a2uiWidget()',
  Bloks: 'FOABloksPrimitive + bloksSection() / bloksWidget()',
  'Footer CTA': 'GenAIFooterActionPrimitive + footerActionSection()',
  'Place Item': 'GenAIPlaceDetailsItem + placeItem()',
  'Social Entity': 'GenAISocialEntityItem + socialEntityItem()',
  'Product Item': 'GenAIProductEntityItem + productEntityItem()',
  'Thread Surfing': 'GenAIThreadSurfingItem + threadSurfingItem()'
};

async function airichFeaturesCommand(sock, chatId, msg, args = []) {
  try {
    const title = 'AIRich Features';
    const body = [
      'Hizi ndizo feature za AIRich / rich-response ziliopo kwenye attachment.',
      'Zote ziko kwenye core widget architecture ya WhatsApp/Meta UI.',
      '',
      'Tap button unayoona kwa mfano:'
    ].join('\n');

    const builder = new ButtonV2(sock)
      .text(body)
      .setThumbnail('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80')
      .setFooter('AIRich • Feature gallery');

    for (const group of FEATURE_GROUPS) {
      for (const feature of group) {
        builder.button(feature, `airich:${feature.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
      }
    }

    await builder.send(chatId, {
      quoted: msg,
      fallbackText: body
    });

    if (args && args.length) {
      const requested = args.join(' ').trim();
      const match = Object.keys(FEATURE_SUMMARY).find(key => key.toLowerCase() === requested.toLowerCase());
      if (match) {
        const summary = FEATURE_SUMMARY[match];
        await sock.sendMessage(chatId, {
          text: `*${match}*\n${summary}`
        }, { quoted: msg });
      }
    }

    return true;
  } catch (error) {
    console.error('[airich] features failed:', error?.message || error);
    if (sock && chatId) {
      await sock.sendMessage(chatId, { text: '❌ Imeshindikana kupakia feature list ya AIRich.' }, { quoted: msg });
    }
    return false;
  }
}

module.exports = airichFeaturesCommand;
module.exports.command = 'airich';
module.exports.commandName = '.airich';
module.exports.aliases = ['.rich', '.meta', '.features'];
module.exports.description = 'Tangaza feature za AIRich / Meta rich response UI';
module.exports.category = 'AI/BOT';
