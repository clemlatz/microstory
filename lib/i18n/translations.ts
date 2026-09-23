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

  'chatWindow.navAria': 'Navigation',


  'confirmDialog.confirm': 'Confirm',
  'confirmDialog.cancel': 'Cancel',



  'characters.title': 'Characters',
  'characters.empty': 'No characters yet.',
  'characters.namePlaceholder': 'Name',
  'characters.requiredError': 'Name is required.',
  'characters.deleteTitle': 'Delete this character?',

  'notes.title': 'Notes',
  'notes.empty': 'No notes yet.',
  'notes.titlePlaceholder': 'Title',
  'notes.requiredError': 'Title is required.',
  'notes.deleteTitle': 'Delete this note?',

  'documentation.title': 'Documentation',
  'documentation.description': 'Factual reference material — research, sources — to keep the world credible.',
  'documentation.empty': 'No documentation yet.',
  'documentation.titlePlaceholder': 'Title',
  'documentation.urlPlaceholder': 'Source URL (optional)',
  'documentation.requiredError': 'Title is required.',
  'documentation.deleteTitle': 'Delete this documentation entry?',

  'search.placeholder': 'Search characters, notes, documentation…',
  'search.characters': 'Characters',
  'search.notes': 'Notes',
  'search.documentation': 'Documentation',
  'search.noResults': 'No results.',
  'search.error': 'Search failed.',



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
  'login.devButton': 'Log in',
  'login.devLoggingIn': 'Signing in…',

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

  'storyNav.title': 'Navigation',
  'storyNav.search': 'Search',
  'storyNav.overview': 'Overview',
  'storyNav.characters': 'Characters',
  'storyNav.notes': 'Notes',
  'storyNav.documentation': 'Documentation',
  'storyNav.myStories': '← My stories',

  'presentation.title': 'Presentation',
  'presentation.empty': 'No presentation yet.',
  'presentation.edit': 'Edit',
  'presentation.placeholder': 'Describe this story’s world, pitch, or context…',

  'language.label': 'Language',


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
  'common.genericError': 'Une erreur est survenue. Réessayez plus tard.',
  'common.unknownError': 'Erreur inconnue',

  'chatWindow.navAria': 'Navigation',


  'confirmDialog.confirm': 'Confirmer',
  'confirmDialog.cancel': 'Annuler',



  'characters.title': 'Personnages',
  'characters.empty': 'Aucun personnage pour l’instant.',
  'characters.namePlaceholder': 'Nom',
  'characters.requiredError': 'Le nom est obligatoire.',
  'characters.deleteTitle': 'Supprimer ce personnage ?',

  'notes.title': 'Notes',
  'notes.empty': 'Aucune note pour l’instant.',
  'notes.titlePlaceholder': 'Titre',
  'notes.requiredError': 'Le titre est obligatoire.',
  'notes.deleteTitle': 'Supprimer cette note ?',

  'documentation.title': 'Documentation',
  'documentation.description':
    'Matériel de référence factuel — recherches, sources — pour garder l’univers crédible.',
  'documentation.empty': 'Aucune documentation pour l’instant.',
  'documentation.titlePlaceholder': 'Titre',
  'documentation.urlPlaceholder': 'URL de la source (optionnel)',
  'documentation.requiredError': 'Le titre est obligatoire.',
  'documentation.deleteTitle': 'Supprimer cette entrée de documentation ?',

  'search.placeholder': 'Rechercher personnages, notes, documentation…',
  'search.characters': 'Personnages',
  'search.notes': 'Notes',
  'search.documentation': 'Documentation',
  'search.noResults': 'Aucun résultat.',
  'search.error': 'La recherche a échoué.',



  'login.registerIntro':
    'Première utilisation : enregistrez un passkey (biométrie, clé de sécurité…) pour protéger l’accès à l’application.',
  'login.registerButton': 'Enregistrer un passkey',
  'login.registering': 'Enregistrement…',
  'login.loginIntro': 'Authentifiez-vous avec votre passkey pour accéder à l’application.',
  'login.loginButton': 'Se connecter avec le passkey',
  'login.authenticating': 'Authentification…',
  'login.statusCheckError': 'Impossible de vérifier l’état de l’authentification.',
  'login.genericError': 'Une erreur est survenue.',
  'login.ceremonyAborted': 'L’opération a été annulée.',
  'login.devButton': 'Se connecter',
  'login.devLoggingIn': 'Connexion…',

  'logout.ariaLabel': 'Se déconnecter',

  'stories.title': 'Mes histoires',
  'stories.newButton': 'Nouvelle histoire',
  'stories.titlePlaceholder': "Titre de l'histoire",
  'stories.createButton': 'Créer',
  'stories.empty': 'Aucune histoire pour l’instant — créez la première ci-dessus.',
  'stories.rename': 'Renommer',
  'stories.delete': 'Supprimer',
  'stories.deleteTitle': 'Supprimer cette histoire ?',
  'stories.loadError': 'Échec du chargement des histoires',

  'storyNav.title': 'Navigation',
  'storyNav.search': 'Recherche',
  'storyNav.overview': 'Aperçu',
  'storyNav.characters': 'Personnages',
  'storyNav.notes': 'Notes',
  'storyNav.documentation': 'Documentation',
  'storyNav.myStories': '← Mes histoires',

  'presentation.title': 'Présentation',
  'presentation.empty': 'Aucune présentation pour l’instant.',
  'presentation.edit': 'Modifier',
  'presentation.placeholder': 'Décrivez l’univers, le pitch ou le contexte de cette histoire…',

  'language.label': 'Langue',


}

export const translations: Record<Locale, Record<TranslationKey, string>> = { en, fr }
