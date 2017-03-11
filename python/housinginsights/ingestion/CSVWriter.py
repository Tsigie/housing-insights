


from csv import DictWriter
import os


class CSVWriter(object):
    '''
    Takes a row of data, plus the meta data about it, and creates a clean.csv file
    locally that can be later be bulk-uploaded to the database.
    '''

    def __init__(self, meta, manifest_row, filename=None):
        '''
        meta: the parsed json from the meta data containing the format expected of each SQL table
        manifest_row: a dictionary from manifest.csv for the source file currently being acted on
        filename: optional, filename of where to write the data. default is current directory temp_{tablename}.csv
        '''

        self.manifest_row = manifest_row
        self.tablename = manifest_row['destination_table']
        self.meta = meta
        self.fields = meta[self.tablename]['fields']

        #DictWriter needs a list of fields, in order, with the same key as the row dict
        #Meanwhile, we'll use the sql version of the headers in the temp file
        self.csv_fields = []
        self.sql_fields = []
        for field in self.fields:
            self.csv_fields.append(field['source_name'])
            self.sql_fields.append(field['sql_name'])

        #By default, creates a temp csv file wherever the calling module was located
        self.filename = 'temp_{}.psv'.format(self.tablename) if filename == None else filename
        try:
            os.remove(self.filename)
        except OSError:
            pass

        #Using psycopg2 copy_from does not like having headers in the file.
        #self.file = open(self.filename, 'w', newline='')
        #headerwriter = DictWriter(self.file, fieldnames = self.sql_fields, delimiter="|")
        #headerwriter.writeheader()
        #self.file.close()
        #print("header written")

        self.file = open(self.filename, 'a', newline='')
        self.writer = DictWriter(self.file, fieldnames=self.csv_fields, delimiter="|")
        print("ready to append")

    def write(self, row):

        self.writer.writerow(row)

    def open(self):
        '''
        Opens the file for writing. Normally called by init, but can be called
        again by the user if they want to re-open the file for writing
        '''

    def close(self):
        '''
        Since we can't use a with statement in the object, it's the caller's
        responsibility to manually close the file when they are done writing
        '''
        self.file.close()