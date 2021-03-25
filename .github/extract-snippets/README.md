# Extract Snippets for GitHub Actions

Jerry Kindall, Amazon Web Services  
Last updated 24-Mar-2021

## What it is

This is a suite of GitHub Actions workflows with supporting scripts that
extracts code snippets from source code files, which can then be used in
documentation via include directives.  When the code changes, the snippets are
automatically extracted again, and the documentation will pick them up on the
next build.

There are two separate workflows: 

* Extract Snippets (`extract-snippets.yaml`): Extracts snippets from all source
  files in the repo.  Runs on a commit to the main or master branch; can also
  be run manually.

* Extract Snippets Dry Run (`extract-snippets-dryrun.yml`): Extracts snippets
  from all source files in a pull request but does not check in any snippets;
  meant to validate PRs.

To prevent the introduction of errors in the snippets (e.g. duplicate snippet
filenames with different content), all files in the repo are always processed.
This is not noticeably slower than e.g. processing only the files in a given
commit; the overhead of the action setup and Git commands dwarfs the run time
of the actual snippet extraction.

## Snippet tags

Snippet tags are special single-line comments in source files.  They must not
follow any code on their line and must begin with the language's single-line
comment marker (`//` in many languages, `#` in some others).  If a language
does not have a single-line comment marker, the block comment delimiter may be
used, but must be closed on the same line following the snippet tag.  The
snippet tag is followed by the snippet directive, a colon, and an argument in
square brackets.  Whitespace is permitted (but optional) between the comment
marker and the snippet directive. For example:

`// snippet-start:[cdk.typescript.widget_service]`

Here, the directive begins the extraction of a code snippet to the filename
specified, with a `.txt` extension.

The main tags used in our repos are `snippet-start` and `snippet-end`.  Each
`snippet-start` requires a matching `snippet-end` (specifying the same snippet
name) in the same source file.  Multiple snippets may be extracted from one
source file, and may overlap.  Snippet tags do not appear in the extracted
snippets.

The following two tags are unique to this extractor (they are not supported by
the original snippet extractor used in the AWS SDK Examples repo).

* `snippet-append`: Extracts additional source code to a snippet file that has
  already been created by a previous `snippet-start` directive, stopping at
  `snippet-end` as with `snippet-start`.

* `snippet-echo`: Writes the argument literally to the snippet(s) currently
  being extracted.  Useful for adding closing braces etc. when extracting a
  partial code block.  Whitespace is stripped from the right of the argument
  but not the left, so you can match indentation.

Unique to this extractor, `snippet-start` supports an optional number following
the closing bracket.  

`// snippet-start:[my-snippet] 8` 

If this number is present, that many spaces are removed from the beginning of
each line of the snippet, allowing snippets to be dedented (have indentation
removed), so their left margin is decreased.  Each snippet, even overlapping
snippets, has its own dedent level.  If you use `snippet-append`, it uses the
same dedent specified on `snippet-start`.  Dedent does not affect
`snippet-echo` (provide the desired indentation yourself).

This extractor also recognizes the following tags (i.e. they are not errors),
but does not do anything with them.  They are supported for compatibility with
source files tagged for the AWS SDK Examples repo extractor, which can register
metadata about each snippet.

* `snippet-keyword`
* `snippet-service`
* `snippet-sourceauthor`
* `snippet-sourcedate`
* `snippet-sourcedescription`
* `snippet-sourcesyntax`
* `snippet-sourcetype`

## extract-snippets.sh

This `bash` script calls the Python script (described next) to extract the
snippets, then checks the results in to the `snippets` branch of the repo. 
If the script is passed any argument (value is irrelevant), it exits after
extracting the snippets without adding them to the repo ("dry run" mode).

## extract-snippets.py

This script reads from standard input the paths of the files containing the
snippets to be extracted.  It ignores non-source files, hidden files, and
files in hidden directories (it is not necessary to filter out such files
beforehand). The script's required argument is the directory that the snippets
should be extracted into.

For example, the following command runs the script on source files in the
current directory, extracting snippets also into the current directory.

`ls | python3 extract-snippets.py .`

Both Windows and Linux-style paths are supported (they are converted to Linux-
style paths internally).

The supported source file formats are stored in `snippet-extensions.yml`, which
contains a map of filename extensions to comment markers.  If a language
supports more than one line comment marker, you can provide them separated by
whitespace in a single string:

`php: "# //"`

If a language does not support a line comment marker (e.g. C), you can specify
its starting block comment marker.  However, snippet tags must then have the
closing block comment marker on the same line, e.g.:

`/* snippet-start:[terry.riley.in-c] */`

Some languages support both line and block comments.  In this case, we suggest
you always use the line comment marker for snippet tags.

You may pass a different YAML (or JSON) file as the script's second argument --
for example, the provided `snippet-extensions-more.yml`, which contains a more
extensive map of source formats.  Note that if you specify only a filename, the
file of that name in the same directory as the script (not in the working
directory!) is used.  To specify a file in the current directory, use `./`,
e.g. `./my-snippet-extensions.yml`.

The keys in `snippet-extensions.yml` are matched case-sensitively at the end of
file paths, and can be used to match more than extensions.  If you wanted to
extract snippets from makefiles, for example, you could add to the mapping:

`/makefile: "#"`

If a given key could match more than one language, the first one listed in the
extension file wins.

To match all files, use `""` as the key, since there's an empty string at the
end of every path.  You probably shouldn't do this, but you *can.*

To exclude a file or files from being processed, specify the end of its path
and an empty string as the comment marker.  Such items should appear earlier
in the file than others that might match, since the first match wins.

`"/lambda/widgets.js": ""`

The output of `extract-snippets.py` is a list of the source files processed.
Indented under each source file is a list of the snippets extracted from it, if
any, marked with `W`, `A` (for "write" or "append") or `X` for a duplicate
snippet that has already been extracted.  At the end of the run, a summary line
displays the number of unique snippets extracted and the number of source files
examined.

## Errors

The following situations are errors.

* Unrecognized snippet tag (see earlier section for supported tags).

* Text decoding error.  By default, source files are assumed to be ASCII. To
  change the encoding used, sent the environment variable `SOURCE_ENCODING` to
  `utf8` or another encoding.  Use the Python name, which you can find here:

  https://docs.python.org/3/library/codecs.html#standard-encodings

  Generally you'd do this in the action file, not in the `bash` script.  Like:

```yaml
    # goes under the `steps` key
    env:
        SOURCE_ENCODING: utf-8
```

* `snippet-start` for a snippet file that has already been extracted, *unless*
  the source file has the same filename and contains exactly the same code.
  This behavior supports multiple examples that contain the same source code
  for an incorporated Lambda function or other asset, where that code contains
  snippets.

* `snippet-end` with no corresponding `snippet-start` or `snippet-append` in
  the same source file.

* Missing `snippet-end` corresponding to a `snippet-start` or `snippet-append`.

* `snippet-append` with no corresponding `snippet-start` in the same source
  file (you can't append to snippets created in a different source file).

* `snippet-echo` outside of a snippet.

* Insufficient whitespace at the beginning of a line to dedent it as requested.

* Any snippet contains a tab character (ASCII 9), as indenting by tab is not
  supported in documentation.

All errors stop processing, and the entire workflow fails.  No snippets will
be checked in to the repo.

# README-SNIPPETS.txt

This text file is copied into the snippets directory as README.txt and should
provide information that users of the snippets should know.

# Version history

* v.1.0.0 - Initial public release.
