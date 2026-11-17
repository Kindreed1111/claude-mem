HUMOR-BANK — Banque d'images humour
===================================

Déposez ici vos images perso (memes, montages, caricatures...).
Chaque carte de champion essaie D'ABORD de charger, dans cet ordre :

    ./humor-bank/<ID>.png
    ./humor-bank/<ID>.jpg
    ./humor-bank/<ID>.webp

Si aucun fichier n'existe, la carte bascule automatiquement (événement onerror,
sans erreur bloquante) sur l'image officielle du dossier ../champions/
(issue de leagueoflegends.com), puis sur l'icône Data Dragon, avec le style "Carte Meme"
(cadre BD, filtre pop-art, badge emoji, punchline).

RÈGLES DE NOMMAGE
-----------------
- <ID> = identifiant technique Data Dragon, PAS le nom affiché.
- Sensible à la casse : "MonkeyKing.png" fonctionne, "monkeyking.png" non
  (sur serveur Linux / macOS sensible à la casse).
- Pas d'espaces, pas d'apostrophes, pas d'accents.

Exemples de pièges :
    Wukong        -> MonkeyKing.png
    Kai'Sa        -> Kaisa.png
    Cho'Gath      -> Chogath.png
    Kha'Zix       -> Khazix.png
    Vel'Koz       -> Velkoz.png
    Bel'Veth      -> Belveth.png
    Rek'Sai       -> RekSai.png
    Kog'Maw       -> KogMaw.png
    Dr. Mundo     -> DrMundo.png
    Jarvan IV     -> JarvanIV.png
    Nunu & Willump-> Nunu.png
    Renata Glasc  -> Renata.png
    LeBlanc       -> Leblanc.png

LISTE EXACTE
------------
La liste de référence est dans ../noms-fichiers.txt (vérifiée contre Data Dragon).

Le fichier ../noms-fichiers.txt fourni à la racine a été vérifié contre
Data Dragon 16.22.1 (173 champions). À mettre à jour après un
nouveau patch.

FORMAT CONSEILLÉ
----------------
- Carré ou portrait, 512 x 512 px minimum.
- Le visuel est recadré en "cover" dans la carte et dans l'écran Face-à-Face.
- Rechargez la page (Ctrl+F5) après avoir ajouté des images.
