# extract-snippets.py v1.0.0
# Jerry Kindall, Amazon Web Services

# extracts marked regions from source files and writes them to a snippets directory.
# reads list of paths from stdin and extracts snippets from these files.  Takes the
# directory to which snippets should be extracted as a command line argument.  The
# second command line argument is optional and specifies the YAML file that contains
# a map of filename extensions to comment markers (default: snippet-extensions.yml
# in the same directory as this script)

# examples: 
#
#       extract snippets from last commit on current git branch to /tmp
#           git diff @^ --name-only | python3 extract-snippets.py /tmp
#
#       extract snippets from all files to specified directory
#           find . -type f | python3 extract-snippets.py /path/to/snippets/dir
#
#       extract snippets from all files in current dir to current dir,
#       specifying a different filename map
#           ls | python3 extract-snippets.py . snippet-extensions-more.yml

# The same snippet can be extracted from more than one source file ONLY if all
# source files containing the snippet have the same filename and contents.  
# this is to support e.g. Lambda functions deployed by a CDK app, where the
# CDK app is provided in multiple languages but the same Lambda function source
# code (snippet tags included) is used in each version.  Ideally the snippet tags
# would be removed from the copies of the Lambda source files... ideally.

import sys, os, yaml, re, functools

# all open() calls have an implied encoding parameter
open = functools.partial(__builtins__.open, 
    encoding=os.environ.get("SOURCE_ENCODING", "utf8"))

# some constants to make our lives easier
TAB = "\t"
EOL = "\n"

# regular expression for matching dedent: 1 or 2 digits
DIGITS = re.compile("[0-9][0-9]?")

# returns cached contents of a file if it exists, or reads it into the cache and
# returns it if not.  cache is stored as a default parameter value.
#
# the cache is used only when there are duplicate snippets in two or more source files.
# only one copy of the file is ever cached (the first one that was found) so this shouldn't
# run up memory too much if you don't have many duplicate snippets.
def cached(path, cache={}):
    if path not in cache:
        with open(path) as infile:
            cache[path] = infile.read()
    return cache[path]

# our exception class to make error messages clearer
class SnipperError(Exception):
    pass

# a file-like object used to avoid writing duplicate snippets we've already extracted
class DummyFile:

    def __init__(self, *args, **kwargs):
        pass

    def write(self, text):
        pass

    def close(self):
        pass

# the class that does the snippet extraction. instantiate it passing the directory to
# which snippets should be extracted.  call the instance with each source file from
# which snippets should be extracted.
class Snipper:

    # initialize Snipper
    def __init__(self, snippetdir):
        self.dir        = snippetdir    # directory where snippets will be extracted
        self.source     = {}            # stores source file of each snippet
        self.count      = 0             # number of snippets extracted
 
    # extract snippets from a single file
    # example snippet tag: // snippet-start:[snippet-name] 8
    def __call__(self, path, markers):
        self.started    = set()         # snippets we've started in this source file
        self.duplicates = set()         # snippets we've determined are duplicates so we won't append/echo
        print(path)
        tag = re.compile(f" *({'|'.join(markers)}) ?snippet-") # e.g. if ext is "// #" end up with regex: " *(#|//) ?snippet-"
        self.files  = {}                # files currently open to write snippets
        self.dedent = {}                # amount of whitespace to strip from each line of snippet
        self.path = path                # source file we are working with (store it on instance so we can use it in error messages)
        with open(path) as infile:      # read source file entirely into memory
            self.text = infile.read().rstrip()
        # process each line in source file. self.i is the line we're on (for error messages)
        for self.i, self.line in enumerate(self.text.splitlines(keepends=False), start=1):
            line = self.line            # use a local variable for a bit more performance
            if tag.match(line):         # line is a snippet directive, parse and process it
                self.directive = line.split("snippet-")[1].split(":")[0].rstrip()   # get e.g. append fron snippet-append
                self.arg = line.split("[")[1].split("]")[0].rstrip()                # get e.g. snippet-name from [snippet-name]
                getattr(self, self.directive.lstrip("_"))(self.arg)     # call our method named same as directive (e.g. start(..) for snippet-start)
            else:                       # line is NOT a snippet directive. write it to any open snippet files
                for snip, file in self.files.items():           # for each snippet we're writing, write the line
                    if TAB in line:                             # our doc systems don't indent tabs consistently, so ban tab
                        raise SnipperError("tab found in snippet %s at line %s in %s" % self._where)
                    dedent = self.dedent[snip]
                    if dedent and line[:dedent].strip():        # is the text we want to strip to dedent all whitespace? error if not 
                        raise SnipperError(("unable to dedent %s space(s) " % dedent) + 
                            ("in snippet %s at line %s in %s " % self._where) + 
                            f"(only indented {len(line) - len(line.lstrip())})")
                    file.write(line[dedent:].rstrip() + EOL)    # write it (strip whitespace at end just to be neat)
        # done processing this file. make sure all snippets had snippet-end tags
        if self.files:
            raise SnipperError("snippet-end tag(s) for %s missing in %s" % (" ".join(self.files), path))

    # directive: beginning of snippet
    def start(self, arg):
        path = os.path.join(self.dir, f"{arg}.txt")
        indicator = "W"
        opener = open
        if arg in self.files:
            raise SnipperError("snippet %s already open at line %s in %s" % self._where)
        if os.path.isfile(path):
            # if snippet output already exists, this is OK only if it is being taken
            # from a source file of the same name with identical content
            if self.path != self.source[arg] and self.path.rpartition("/")[2] == self.source[arg].rpartition("/")[2] and self.text == cached(self.source[arg]):
                indicator = "X"         # show thtis is a duplicate
                opener = DummyFile      # don't write to this file
                self.duplicates.add(arg)
            else:
                raise SnipperError(("duplicate snippet %s at line %s in %s" % self._where) +
                    " (originally defined in %s)" % self.source[arg])
        else:
            self.count += 1
        # parse number at end of line as dedent value
        self.dedent[arg] = int(DIGITS.search(self.line.rpartition("]")[2] + " 0").group(0))
        self.files[arg] = opener(path, "w")     # open real file or dummy
        self.started.add(arg)       # record that we started this snippet in this source file
        if arg not in self.source:  # record that we *first* saw this snippet in this source file
            self.source[arg] = self.path
        print("   ", indicator, arg)

    # directive: append to given file (for extracting multiple chunks of code to a single snippet)
    def append(self, arg):
        if arg in self.files:           # is the file already open?
            raise SnipperError("snippet %s already open at line %s in %s" % self._where)
        if arg not in self.started:     # did we start this snippet in current source file?
            raise SnipperError("snippet file %s not found at line %s in %s" % self._where)
        self.files[arg] = DummyFile() if arg in self.duplicates else open(os.path.join(self.dir, arg) + ".txt", "a")
        print("    A", arg)

    # directive: end of snippet
    def end(self, arg):
        if arg in self.files:
            self.files[arg].close()
            del self.files[arg]
        else:
            raise SnipperError("snippet file %s not open at %s in %s" % self._where)

    # directive: insert arg as a line into all currently open snippets (useful for e.g. adding closing brackets to partial snippet)
    def echo(self, arg):
        arg = arg.rstrip() + EOL
        if self.files:
            for file in self.files.values():
                file.write(arg)
        else:
            raise SnipperError("echo '%s' outside snippet at %s in %s" % self._where)

    # do-nothing handler used for directives that we ignore
    def _nop(self, arg): return

    # the aforementioned ignored directives
    service = comment = keyword = sourceauthor = sourcedate = sourcedescription = sourcetype = _nop

    # convenience property for returning error location tuple (used in error messages)
    @property
    def _where(self):
        return self.arg, self.i, self.path

    # called when there's no method on this class to handle a directive, which is an error
    def __getattr__(self, name):
        raise SnipperError("invalid directive snippet-%s at %s in %s" % (self.directive, self.i, self.path))

# ----------------------------------------------------------------------------

if __name__ == "__main__":

    # get output directory from command line, or error
    if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
        snippetdir = sys.argv[1]
    else:
        raise FileNotFoundError("snippet output directory not passed, does not exist, or is not empty")

    # get filename of extersions list from command line, or use default, then load it
    if len(sys.argv) > 2:
        commentfile = sys.argv[2]
    else:
        commentfile = "snippet-extensions.yml"
    # if no directory specified, file is in same directory as script
    if "/" not in commentfile and "\\" not in commentfile:
        commentfile = os.path.join(os.path.dirname(__file__), commentfile)
    if not os.path.isfile(commentfile):
        raise FileNotFoundError("source file extension map %s not found" % commentfile)
    with open(commentfile) as comments:
        MAP_EXT_MARKER = {k: v.split() for k, v in yaml.safe_load(comments).items()}

    print("extracting snippets in source files", 
        " ".join(ex for ex in MAP_EXT_MARKER if MAP_EXT_MARKER[ex]), "\n")

    # initialize snipper instance and our counters
    snipper = Snipper(snippetdir)
    seen = processed = 0

    # main loop: for each file named on stdin, check to see if we should process it, and do so
    try:

        for path in sys.stdin:
            path = path.strip().replace("\\", "/")  # standardize on Linux-style paths
            if not path:                            # skip blank lines in input
                continue
            if not path.startswith("./") and not path.startswith("/") and path[2:3] != ":":
                path = "./" + path
            if "/." in path:                        # skip hidden file or directory
                continue
            seen += 1                               # count files seen (not hidden)
            ext = next((ext for ext in MAP_EXT_MARKER if path.endswith(ext)), None)
            markers = MAP_EXT_MARKER.get(ext, "")
            if markers:                              # process it if we have comment markers
                snipper(path, markers)               # returns 1 if file processed, 0 if not
                processed += 1

        # print summary of what we processed and exit (successfully)
        print("\n====", snipper.count, "snippet(s) extracted from", processed, 
            "source file(s) processed of", seen, "candidate(s)\n")
        sys.exit(0) 

    except Exception as ex:

        # get all line numbers in traceback
        tb = ex.__traceback__
        lines = []
        while lines.append(str(tb.tb_lineno)) or tb.tb_next:    
            tb = tb.tb_next
        # print short error message and exit (unsuccessfully)
        print(f"@{'.'.join(reversed(lines))} {type(ex).__name__}: {ex}")
        sys.exit(1)
