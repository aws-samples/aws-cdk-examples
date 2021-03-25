# extract-snippets.sh v1.0.0
# Jerry Kindall, Amazon Web Services

# this script manages updating of snippets found in source code to the snippets branch

# the args to this script constitute the command that is executed to get the list of source
# files to be processed.  for example, if it is run on push, pass e.g.: git diff @^ --name-only
# to process only the files included in the last push.  to process all files, pass e.g.:
# find . --type f

# snippets are never deleted, as this would break any document where they're used.

mkdir ../snippets
cp .github/extract-snippets/README-SNIPPETS.txt ../snippets/README.txt

python -m pip install --upgrade pip pyyaml
find . -type f | python .github/extract-snippets/extract-snippets.py ../snippets || exit 1

test -n "$1" && exit 0   # dry run if any value in first argument

git checkout --track origin/snippets
mkdir -p snippets
cp ../snippets/* snippets

git config --local user.email  "41898282+github-actions[bot]@users.noreply.github.com"
git config --local user.name   "github-actions[bot]"
git add --all 
git commit -m "Updated on `date -R`"
exit 0