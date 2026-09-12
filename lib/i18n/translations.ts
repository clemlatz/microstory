/**
 * The full set of UI strings, in English (the default locale) and French
 * (the only other locale a user can switch to — see `LocaleContext.tsx`).
 * Flat, dot-separated keys rather than a nested object: simpler to look up
 * (`translations[locale][key]`) and simpler to keep the two locales in sync
 * (a missing key is immediately visible as a diff between the two object
 * literals below).
 *
 * This intentionally covers only UI chrome — labels, buttons, placeholders,
 * status messages. It never touches generated story text, the writer
 * prompt, character/note content, or anything else the user writes or the
 * LLM produces: none of that is translated, since translating narrative
 * content is a completely different (and out of scope) feature from
 * translating the interface around it.
 */

export type Locale = 'en' | 'fr'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr']

export const DEFAULT_LOCALE: Locale = 'en'

const en = {
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.saved': 'Saved',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.genericError': 'Something went wrong. Please try again later.',
  'common.unknownError': 'Unknown error',

  'chatWindow.fallbackError': 'Sorry, something went wrong. Please try again later.',
  'chatWindow.errorPrefix': 'Error: {message}',
  'chatWindow.summarizeErrorPrefix': 'Summary failed: {message}',
  'chatWindow.closeAria': 'Close',
  'chatWindow.configAria': 'Configuration',
  'chatWindow.backToStory': '← Story',
  'chatWindow.backToStoryAria': 'Back to story',
  'chatWindow.myStories': 'My stories',
  'chatWindow.myStoriesAria': 'My stories',
  'chatWindow.historyAria': 'Manuscript history',
  'chatWindow.resetTitle': 'Reset the conversation?',
  'chatWindow.resetConfirm': 'Reset',
  'chatWindow.thinking': 'Thinking…',
  'chatWindow.writing': 'Writing…',
  'chatWindow.summarizing': 'Summarizing…',
  'chatWindow.send': 'Send',
  'chatWindow.stop': 'Stop',
  'chatWindow.continuePlaceholder': 'Continue, or tell it what to change…',

  'messageInput.placeholder': 'Write your message…',
  'messageInput.send': 'Send',
  'messageInput.stop': 'Stop',
  'messageInput.cancel': 'Cancel',

  'confirmDialog.confirm': 'Confirm',
  'confirmDialog.cancel': 'Cancel',

  'writerPrompt.title': 'Writer prompt',
  'writerPrompt.description':
    'Give the model a role or style (e.g. "you are a crime novelist"). It applies to the next messages.',
  'writerPrompt.placeholder': 'You are a crime novelist...',
  'writerPrompt.saved': 'Prompt saved.',
  'writerPrompt.wordLimitTitle': 'Generated text length',
  'writerPrompt.wordLimitDescription':
    'Maximum number of words the model should write in the fiction text each turn (a best-effort instruction, not a guaranteed limit).',
  'writerPrompt.wordLimitSaved': 'Limit saved.',
  'writerPrompt.verbatimTitle': 'Immediate context window',
  'writerPrompt.verbatimDescription':
    'Number of recent words (full messages) sent as-is to the model each turn, to keep the style and pace of the latest lines.',
  'writerPrompt.verbatimSaved': 'Window saved.',
  'writerPrompt.autoSummaryTitle': 'Automatic summary threshold',
  'writerPrompt.autoSummaryDescription':
    "Number of pending words (beyond the immediate context window) that triggers, in the background, automatic condensation into the story's summary.",
  'writerPrompt.autoSummarySaved': 'Threshold saved.',

  'llmStatus.modelTitle': 'Model',
  'llmStatus.statusTitle': 'Status',
  'llmStatus.loaded': 'Loaded',
  'llmStatus.loading': 'Loading…',
  'llmStatus.unavailable': 'Unavailable',
  'llmStatus.repetitionTitle': 'Repetition penalty',
  'llmStatus.repetitionDescription':
    'Discourages the model from looping on the same words/phrasing ({min} = disabled, {max} = usual maximum).',
  'llmStatus.repetitionSaved': 'Penalty saved.',

  'characters.title': 'Characters',
  'characters.empty': 'No characters yet.',
  'characters.namePlaceholder': 'Name',
  'characters.requiredError': 'Name is required.',

  'notes.title': 'Notes',
  'notes.empty': 'No notes yet.',
  'notes.titlePlaceholder': 'Title',
  'notes.requiredError': 'Title is required.',

  'history.loading': 'Loading history…',
  'history.empty': 'Nothing to show yet — history will fill in as the conversation goes.',
  'history.summaryLabel': 'Summary ({type}) — sent on next turn',
  'history.typeManual': 'manual',
  'history.typeAuto': 'automatic',
  'history.promptLabel': 'Prompt',
  'history.saving': 'Saving…',
  'history.resetButton': 'Clear',
  'history.summarizeButton': 'Summarize',
  'history.viewAria': 'Manuscript history',

  'storyView.empty': 'Generated text will appear here as the conversation goes.',
  'storyView.promptLabel': 'Prompt',
  'storyView.summaryLabel': 'Summary',
  'storyView.thinking': 'Thinking…',
  'storyView.summarizing': 'Summarizing…',
  'storyView.editPrompt': 'Edit',

  'login.registerIntro':
    'First use: register a passkey (biometrics, security key…) to protect access to the app.',
  'login.registerButton': 'Register a passkey',
  'login.registering': 'Registering…',
  'login.loginIntro': 'Authenticate with your passkey to access the app.',
  'login.loginButton': 'Log in with passkey',
  'login.authenticating': 'Authenticating…',
  'login.statusCheckError': 'Unable to check the authentication status.',
  'login.genericError': 'Something went wrong.',
  'login.ceremonyAborted': 'The operation was cancelled.',

  'logout.ariaLabel': 'Log out',

  'stories.title': 'My stories',
  'stories.newButton': 'New story',
  'stories.titlePlaceholder': 'Story title',
  'stories.createButton': 'Create',
  'stories.empty': 'No stories yet — create the first one above.',
  'stories.rename': 'Rename',
  'stories.delete': 'Delete',
  'stories.deleteTitle': 'Delete this story?',
  'stories.loadError': 'Failed to load stories',

  'storyHome.back': '← My stories',
  'storyHome.openManuscript': 'Manuscript',

  'language.label': 'Language',

  'contextGauge.tooltip': '{pending} / {threshold} words before automatic summary',

  'configPanel.writingTab': 'Writing',
} as const

export type TranslationKey = keyof typeof en

const fr: Record<TranslationKey, string> = {
  'common.confirm': 'Confirmer',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.saving': 'Enregistrement…',
  'common.saved': 'Enregistré',
  'common.add': 'Ajouter',
  'common.edit': 'Modifier',
  'common.delete': 'Supprimer',
  'common.close': 'Fermer',
  'common.loading': 'Chargement…',
  'common.genericError': 'Une erreur est survenue. Réessaie plus tard.',
  'common.unknownError': 'Erreur inconnue',

  'chatWindow.fallbackError': 'Désolé, une erreur est survenue. Réessaie plus tard.',
  'chatWindow.errorPrefix': 'Erreur : {message}',
  'chatWindow.summarizeErrorPrefix': 'Résumé impossible : {message}',
  'chatWindow.closeAria': 'Fermer',
  'chatWindow.configAria': 'Configuration',
  'chatWindow.backToStory': '← Histoire',
  'chatWindow.backToStoryAria': 'Retour à l’histoire',
  'chatWindow.myStories': 'Mes histoires',
  'chatWindow.myStoriesAria': 'Mes histoires',
  'chatWindow.historyAria': 'Historique du manuscrit',
  'chatWindow.resetTitle': 'Réinitialiser la conversation ?',
  'chatWindow.resetConfirm': 'Réinitialiser',
  'chatWindow.thinking': 'En train de réfléchir…',
  'chatWindow.writing': "En train d'écrire…",
  'chatWindow.summarizing': 'En train de résumer…',
  'chatWindow.send': 'Envoyer',
  'chatWindow.stop': 'Stop',
  'chatWindow.continuePlaceholder': 'Continue, ou dis-lui quoi changer…',

  'messageInput.placeholder': 'Écris ton message…',
  'messageInput.send': 'Envoyer',
  'messageInput.stop': 'Stop',
  'messageInput.cancel': 'Annuler',

  'confirmDialog.confirm': 'Confirmer',
  'confirmDialog.cancel': 'Annuler',

  'writerPrompt.title': "Prompt d'écriture",
  'writerPrompt.description':
    'Donne un rôle ou un style au modèle (ex. « tu es un auteur de roman policier »). Il s’applique aux prochains messages.',
  'writerPrompt.placeholder': 'Tu es un auteur de roman policier...',
  'writerPrompt.saved': 'Prompt enregistré.',
  'writerPrompt.wordLimitTitle': 'Longueur du texte généré',
  'writerPrompt.wordLimitDescription':
    'Nombre maximum de mots que le modèle doit écrire dans le texte de fiction à chaque tour (indication, pas une limite garantie).',
  'writerPrompt.wordLimitSaved': 'Limite enregistrée.',
  'writerPrompt.verbatimTitle': 'Fenêtre de contexte immédiat',
  'writerPrompt.verbatimDescription':
    'Nombre de mots récents (messages complets) envoyés tels quels au modèle à chaque tour, pour garder le style et le rythme des dernières lignes.',
  'writerPrompt.verbatimSaved': 'Fenêtre enregistrée.',
  'writerPrompt.autoSummaryTitle': 'Seuil de résumé automatique',
  'writerPrompt.autoSummaryDescription':
    "Nombre de mots en attente (au-delà de la fenêtre de contexte immédiat) qui déclenche, en arrière-plan, la condensation automatique dans le résumé de l'histoire.",
  'writerPrompt.autoSummarySaved': 'Seuil enregistré.',

  'llmStatus.modelTitle': 'Modèle',
  'llmStatus.statusTitle': 'Statut',
  'llmStatus.loaded': 'Chargé',
  'llmStatus.loading': 'En cours de chargement…',
  'llmStatus.unavailable': 'Indisponible',
  'llmStatus.repetitionTitle': 'Pénalité de répétition',
  'llmStatus.repetitionDescription':
    'Décourage le modèle de reboucler sur les mêmes mots/tournures ({min} = désactivée, {max} = maximum usuel).',
  'llmStatus.repetitionSaved': 'Pénalité enregistrée.',

  'characters.title': 'Personnages',
  'characters.empty': 'Aucun personnage pour l’instant.',
  'characters.namePlaceholder': 'Nom',
  'characters.requiredError': 'Le nom est obligatoire.',

  'notes.title': 'Notes',
  'notes.empty': 'Aucune note pour l’instant.',
  'notes.titlePlaceholder': 'Titre',
  'notes.requiredError': 'Le titre est obligatoire.',

  'history.loading': "Chargement de l'historique…",
  'history.empty': "Rien à afficher pour l'instant — l'historique se remplira au fil de la conversation.",
  'history.summaryLabel': 'Résumé ({type}) — envoyé au prochain tour',
  'history.typeManual': 'manuel',
  'history.typeAuto': 'automatique',
  'history.promptLabel': 'Prompt',
  'history.saving': 'Enregistrement…',
  'history.resetButton': 'Effacer',
  'history.summarizeButton': 'Résumer',
  'history.viewAria': 'Historique du manuscrit',

  'storyView.empty': 'Le texte généré apparaîtra ici au fil de la conversation.',
  'storyView.promptLabel': 'Prompt',
  'storyView.summaryLabel': 'Résumé',
  'storyView.thinking': 'En train de réfléchir…',
  'storyView.summarizing': 'En train de résumer…',
  'storyView.editPrompt': 'Modifier',

  'login.registerIntro':
    'Première utilisation : enregistre un passkey (biométrie, clé de sécurité…) pour protéger l’accès à l’application.',
  'login.registerButton': 'Enregistrer un passkey',
  'login.registering': 'Enregistrement…',
  'login.loginIntro': 'Authentifie-toi avec ton passkey pour accéder à l’application.',
  'login.loginButton': 'Se connecter avec le passkey',
  'login.authenticating': 'Authentification…',
  'login.statusCheckError': 'Impossible de vérifier l’état de l’authentification.',
  'login.genericError': 'Une erreur est survenue.',
  'login.ceremonyAborted': 'L’opération a été annulée.',

  'logout.ariaLabel': 'Se déconnecter',

  'stories.title': 'Mes histoires',
  'stories.newButton': 'Nouvelle histoire',
  'stories.titlePlaceholder': "Titre de l'histoire",
  'stories.createButton': 'Créer',
  'stories.empty': 'Aucune histoire pour l’instant — crée la première ci-dessus.',
  'stories.rename': 'Renommer',
  'stories.delete': 'Supprimer',
  'stories.deleteTitle': 'Supprimer cette histoire ?',
  'stories.loadError': 'Échec du chargement des histoires',

  'storyHome.back': '← Mes histoires',
  'storyHome.openManuscript': 'Manuscrit',

  'language.label': 'Langue',

  'contextGauge.tooltip': '{pending} / {threshold} mots avant résumé automatique',

  'configPanel.writingTab': 'Écriture',
}

export const translations: Record<Locale, Record<TranslationKey, string>> = { en, fr }
